const { Op } = require('sequelize');
const AbandonedCheckout = require('../models/abandonedCheckout.model');
const AbandonedCartStoreConfig = require('../models/abandonedCartStoreConfig.model');
const AbandonedCartMessageLog = require('../models/abandonedCartMessageLog.model');
const { logSuccess, logFailed } = require('../utils/loggerHelper');
const { scheduleFirstReminder, cancelPendingReminders } = require('../utils/abandonedCartHelper');
const { extractPhoneFromOrder, formatPhoneNumber } = require('../utils/phoneHelper');


exports.handleCheckoutWebhook = async (store, checkoutData) => {
  try {
   
    if (checkoutData?.order_id || checkoutData?.completed_at) {
      await logSuccess({
        store_id: store.id, store_name: store.store_name,
        order_id: checkoutData?.id, order_number: null,
        channel: 'system', action: 'abandoned_cart_webhook',
        message: 'Checkout already converted to order - skipped',
      });
      return { success: true, message: 'Already converted - skipped' };
    }

    
    const config = await AbandonedCartStoreConfig.findOne({ where: { store_id: store.id } });
    if (!config || !config.is_enabled) {
      await logSuccess({
        store_id: store.id, store_name: store.store_name,
        order_id: checkoutData?.id, order_number: null,
        channel: 'system', action: 'abandoned_cart_webhook',
        message: 'Abandoned cart service disabled for this store',
      });
      return { success: true, message: 'Service disabled' };
    }

   
    const customerPhone = extractPhoneFromOrder(checkoutData);
    if (!customerPhone) {
      await logFailed({
        store_id: store.id, store_name: store.store_name,
        order_id: checkoutData?.id, order_number: null,
        channel: 'system', action: 'abandoned_cart_webhook',
        message: 'No phone number found in checkout',
        details: { checkout_id: checkoutData?.id },
      });
      return { success: false, message: 'No phone number' };
    }

    
    const checkoutUrl = checkoutData.recovery_url || checkoutData.abandoned_checkout_url;
    if (!checkoutUrl || !checkoutUrl.includes('checkout')) {
      await logFailed({
        store_id: store.id, store_name: store.store_name,
        order_id: checkoutData?.id, order_number: null,
        channel: 'system', action: 'abandoned_cart_webhook',
        message: 'Invalid or missing recovery URL',
        details: { checkout_id: checkoutData?.id, url: checkoutUrl },
      });
      return { success: false, message: 'Invalid recovery URL' };
    }

  
    const checkoutId = String(checkoutData.id);
    const customerName = checkoutData.customer?.first_name
      ? `${checkoutData.customer.first_name} ${checkoutData.customer.last_name || ''}`.trim()
      : 'Guest';

    const [checkout, created] = await AbandonedCheckout.findOrCreate({
      where: { store_id: store.id, shopify_checkout_id: checkoutId },
      defaults: {
        store_id: store.id,
        shopify_checkout_id: checkoutId,
        shopify_checkout_token: checkoutData.token || null,
        customer_name: customerName,
        customer_email: checkoutData.email || checkoutData.customer?.email || null,
        customer_phone: customerPhone,
        cart_items: checkoutData.line_items || [],
        cart_total: checkoutData.total_price || null,
        currency: checkoutData.currency || 'PKR',
        abandoned_checkout_url: checkoutUrl,
        status: 'pending',
        source: 'webhook',
        expires_at: new Date(Date.now() + config.expiry_days * 24 * 60 * 60 * 1000),
      },
    });

    if (!created) {
      if (checkout.status === 'pending' || checkout.status === 'reminded') {
        await checkout.update({
          customer_name: customerName,
          customer_phone: customerPhone,
          cart_items: checkoutData.line_items || checkout.cart_items,
          cart_total: checkoutData.total_price || checkout.cart_total,
          abandoned_checkout_url: checkoutUrl,
          shopify_checkout_token: checkoutData.token || checkout.shopify_checkout_token,
        });
      }

      await logSuccess({
        store_id: store.id, store_name: store.store_name,
        order_id: checkoutData?.id, order_number: null,
        channel: 'system', action: 'abandoned_cart_webhook',
        message: 'Checkout updated (already exists)',
        details: { checkout_id: checkoutId, status: checkout.status },
      });

      return { success: true, message: 'Checkout updated' };
    }

    const scheduleResult = await scheduleFirstReminder(checkout, store, config);

    await logSuccess({
      store_id: store.id, store_name: store.store_name,
      order_id: checkoutData?.id, order_number: null,
      channel: 'system', action: 'abandoned_cart_webhook',
      message: `Checkout saved & ${scheduleResult.scheduled ? 'reminder scheduled' : 'no reminder configured'}`,
      details: {
        checkout_id: checkoutId,
        phone: customerPhone,
        cart_total: checkoutData.total_price,
        scheduled: scheduleResult.scheduled,
      },
    });

    return { success: true, message: 'Checkout saved', data: { id: checkout.id, scheduled: scheduleResult.scheduled } };
  } catch (error) {
    await logFailed({
      store_id: store.id, store_name: store.store_name,
      order_id: checkoutData?.id, order_number: null,
      channel: 'system', action: 'abandoned_cart_webhook',
      message: `Webhook processing error: ${error.message}`,
      details: { error: error.message, checkout_id: checkoutData?.id },
    });
    return { success: false, message: error.message };
  }
};


exports.handleCartRecovery = async (store, orderData) => {
  try {
    const customerPhone = extractPhoneFromOrder(orderData);
    const checkoutToken = orderData.checkout_token || null;

    if (!customerPhone && !checkoutToken) {
      return { success: false, message: 'No phone or checkout token to match' };
    }

    let checkout = null;

    if (checkoutToken) {
      checkout = await AbandonedCheckout.findOne({
        where: {
          store_id: store.id,
          shopify_checkout_token: checkoutToken,
          status: { [Op.in]: ['pending', 'reminded'] },
        },
      });
    }

    if (!checkout && customerPhone) {
      checkout = await AbandonedCheckout.findOne({
        where: {
          store_id: store.id,
          customer_phone: customerPhone,
          status: { [Op.in]: ['pending', 'reminded'] },
        },
        order: [['dt', 'DESC']],
      });
    }

    if (!checkout) {
      return { success: true, message: 'No abandoned checkout found for this order' };
    }

    const now = new Date();
    const orderTotal = orderData.total_price || orderData.current_total_price || null;

    await checkout.update({
      status: 'recovered',
      recovered_at: now,
      recovered_order_id: String(orderData.id),
      recovered_order_total: orderTotal,
    });

    await cancelPendingReminders(checkout.id);

    await AbandonedCartMessageLog.update(
      {
        recovered: true,
        recovered_order_id: String(orderData.id),
        recovered_order_total: orderTotal,
      },
      {
        where: { abandoned_checkout_id: checkout.id },
      }
    );

    await logSuccess({
      store_id: store.id, store_name: store.store_name,
      order_id: orderData.id, order_number: orderData.name,
      channel: 'system', action: 'abandoned_cart_recovered',
      message: `Cart recovered! Order ${orderData.name} - Total: ${orderTotal}`,
      details: {
        checkout_id: checkout.shopify_checkout_id,
        order_id: orderData.id,
        order_total: orderTotal,
        phone: checkout.customer_phone,
        reminders_sent: checkout.reminders_sent,
      },
    });

    return { success: true, message: 'Cart recovered', data: { checkout_id: checkout.id, order_total: orderTotal } };
  } catch (error) {
    await logFailed({
      store_id: store.id, store_name: store.store_name,
      order_id: orderData?.id, order_number: orderData?.name,
      channel: 'system', action: 'abandoned_cart_recovered',
      message: `Recovery check error: ${error.message}`,
      details: { error: error.message },
    });
    return { success: false, message: error.message };
  }
};


exports.expireOldCheckouts = async () => {
  try {
    const now = new Date();

    const expired = await AbandonedCheckout.findAll({
      where: {
        status: { [Op.in]: ['pending', 'reminded'] },
        expires_at: { [Op.lt]: now },
      },
    });

    for (const checkout of expired) {
      await cancelPendingReminders(checkout.id);
      await checkout.update({ status: 'expired' });
    }

    if (expired.length > 0) {
      console.log(`🗑️ Expired ${expired.length} old abandoned checkouts`);
    }

    return { success: true, expired: expired.length };
  } catch (error) {
    console.error(`❌ Expire checkouts error: ${error.message}`);
    return { success: false, message: error.message };
  }
};



