const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const axios = require('axios');
const Store = require('../models/store.model');
const AbandonedCheckout = require('../models/abandonedCheckout.model');
const AbandonedCartStoreConfig = require('../models/abandonedCartStoreConfig.model');
const { abandonedCartSyncQueue } = require('../config/queue');
const { logSuccess, logFailed } = require('../utils/loggerHelper');
const { scheduleFirstReminder } = require('../utils/abandonedCartHelper');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

const worker = new Worker('abandoned-cart-sync', async (job) => {
  console.log('🔄 Starting abandoned cart sync from Shopify...');

  const stores = await Store.findAll({ where: { status: true } });
  const results = [];

  for (const store of stores) {
    try {
      const result = await syncStoreCheckouts(store);
      results.push({ store_id: store.id, store_name: store.store_name, ...result });
    } catch (error) {
      console.error(`❌ Sync failed for store ${store.store_name}: ${error.message}`);
      await logFailed({
        store_id: store.id,
        store_name: store.store_name,
        order_id: null,
        order_number: null,
        channel: 'system',
        action: 'abandoned_cart_sync',
        message: `Sync failed: ${error.message}`,
        details: { error: error.message },
      });
      results.push({ store_id: store.id, store_name: store.store_name, success: false, error: error.message });
    }
  }

  console.log('🔄 Abandoned cart sync completed', results);
  return { success: true, results };
}, {
  connection,
  concurrency: 1,
});

async function syncStoreCheckouts(store) {
  const config = await AbandonedCartStoreConfig.findOne({ where: { store_id: store.id } });
  if (!config || !config.is_enabled) {
    return { success: true, message: 'Service disabled', synced: 0 };
  }

  const cleanUrl = store.store_url.replace(/^https?:\/\//, '');
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let checkouts = [];
  try {
    const response = await axios.get(
      `https://${cleanUrl}/admin/api/2025-01/checkouts.json?created_at_min=${since}&limit=250`,
      {
        headers: {
          'X-Shopify-Access-Token': store.access_token,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    checkouts = response.data?.checkouts || [];
  } catch (error) {
    throw new Error(`Shopify API error: ${error.response?.status || error.message}`);
  }

  if (checkouts.length === 0) {
    return { success: true, message: 'No checkouts found', synced: 0 };
  }

  let synced = 0;
  let skipped = 0;
  let noPhone = 0;

  for (const checkout of checkouts) {
    try {
      if (checkout.order_id || checkout.completed_at) {
        skipped++;
        continue;
      }

      const customerPhone =
        checkout?.billing_address?.phone ||
        checkout?.shipping_address?.phone ||
        checkout?.customer?.phone ||
        checkout?.phone ||
        null;

      if (!customerPhone) {
        noPhone++;
        continue;
      }

      const checkoutUrl = checkout.recovery_url || checkout.abandoned_checkout_url;
      if (!checkoutUrl || !checkoutUrl.includes('checkout')) {
        skipped++;
        continue;
      }

      const checkoutId = String(checkout.id);

      const [record, created] = await AbandonedCheckout.findOrCreate({
        where: { store_id: store.id, shopify_checkout_id: checkoutId },
        defaults: {
          store_id: store.id,
          shopify_checkout_id: checkoutId,
          shopify_checkout_token: checkout.token || null,
          customer_name: checkout.customer?.first_name
            ? `${checkout.customer.first_name} ${checkout.customer.last_name || ''}`.trim()
            : 'Guest',
          customer_email: checkout.email || checkout.customer?.email || null,
          customer_phone: customerPhone.replace(/\+/g, '').trim(),
          cart_items: checkout.line_items || [],
          cart_total: checkout.total_price || null,
          currency: checkout.currency || 'PKR',
          abandoned_checkout_url: checkoutUrl,
          status: 'pending',
          source: 'api_sync',
          expires_at: new Date(Date.now() + config.expiry_days * 24 * 60 * 60 * 1000),
        },
      });

      if (created) {
        synced++;
        await scheduleFirstReminder(record, store, config);
      } else {
        if (record.status === 'pending') {
          await record.update({
            cart_items: checkout.line_items || record.cart_items,
            cart_total: checkout.total_price || record.cart_total,
            abandoned_checkout_url: checkoutUrl,
          });
        }
        skipped++;
      }
    } catch (error) {
      console.error(`⚠️ Error processing checkout ${checkout.id}: ${error.message}`);
      await logFailed({
        store_id: store.id,
        store_name: store.store_name,
        order_id: checkout.id,
        order_number: null,
        channel: 'system',
        action: 'abandoned_cart_sync_item',
        message: `Checkout sync error: ${error.message}`,
        details: { checkout_id: checkout.id, error: error.message },
      });
    }
  }

  await logSuccess({
    store_id: store.id,
    store_name: store.store_name,
    order_id: null,
    order_number: null,
    channel: 'system',
    action: 'abandoned_cart_sync',
    message: `Sync completed: ${synced} new, ${skipped} skipped, ${noPhone} no phone`,
    details: { total: checkouts.length, synced, skipped, noPhone },
  });

  return { success: true, synced, skipped, noPhone, total: checkouts.length };
}


const startSyncScheduler = async () => {
  const existingJobs = await abandonedCartSyncQueue.getRepeatableJobs();
  for (const job of existingJobs) {
    await abandonedCartSyncQueue.removeRepeatableByKey(job.key);
  }

  await abandonedCartSyncQueue.add(
    'sync',
    {},
    {
      repeat: { every: 30 * 60 * 1000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 172800 },
    }
  );

  console.log('🔄 Abandoned cart sync scheduled every 30 minutes');
};

startSyncScheduler().catch(err => {
  console.error('❌ Failed to start sync scheduler:', err.message);
});

worker.on('completed', (job, result) => {
  console.log(`✅ Abandoned cart sync completed: ${job.id}`);
});

worker.on('failed', async (job, err) => {
  console.error(`❌ Abandoned cart sync failed: ${job.id} | Error: ${err.message}`);
});

module.exports = worker;