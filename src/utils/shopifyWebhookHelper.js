const axios = require('axios');

const WEBHOOK_TOPICS = {
  order_split: 'orders/fulfilled',
  order_dispatch: 'orders/fulfilled',
  order_delivered: 'orders/updated',
  order_paid: 'orders/paid',
  order_tracking: 'orders/updated',
};

const getShopifyHeaders = (accessToken) => ({
  'X-Shopify-Access-Token': accessToken,
  'Content-Type': 'application/json',
});

exports.getRegisteredWebhooks = async (store) => {
  try {
    const response = await axios.get(
      `https://${store.store_id}.myshopify.com/admin/api/2023-01/webhooks.json`,
      { headers: getShopifyHeaders(store.access_token) }
    );
    return response.data.webhooks || [];
  } catch (error) {
    console.error('Error fetching webhooks:', error.message);
    return [];
  }
};

exports.registerWebhook = async (store, topic, webhookUrl) => {
  try {
    const existing = await exports.getRegisteredWebhooks(store);
    const alreadyExists = existing.find(w => w.topic === topic && w.address === webhookUrl);

    if (alreadyExists) {
      return { success: true, message: `Webhook ${topic} already registered` };
    }

    const response = await axios.post(
      `https://${store.store_id}.myshopify.com/admin/api/2023-01/webhooks.json`,
      {
        webhook: {
          topic,
          address: webhookUrl,
          format: 'json',
        },
      },
      { headers: getShopifyHeaders(store.access_token) }
    );

    return { success: true, message: `Webhook ${topic} registered`, data: response.data.webhook };
  } catch (error) {
    console.error(`Error registering webhook ${topic}:`, error?.response?.data || error.message);
    return { success: false, message: error?.response?.data?.errors || error.message };
  }
};

exports.unregisterWebhook = async (store, topic, webhookUrl) => {
  try {
    const existing = await exports.getRegisteredWebhooks(store);
    const webhook = existing.find(w => w.topic === topic && w.address === webhookUrl);

    if (!webhook) {
      return { success: true, message: `Webhook ${topic} not found, nothing to remove` };
    }

    await axios.delete(
      `https://${store.store_id}.myshopify.com/admin/api/2023-01/webhooks/${webhook.id}.json`,
      { headers: getShopifyHeaders(store.access_token) }
    );

    return { success: true, message: `Webhook ${topic} unregistered` };
  } catch (error) {
    console.error(`Error unregistering webhook ${topic}:`, error?.response?.data || error.message);
    return { success: false, message: error?.response?.data?.errors || error.message };
  }
};

exports.syncWebhooks = async (store, activeServiceKeys, webhookBaseUrl) => {
  try {
    const webhookUrl = `${webhookBaseUrl.replace(/\/+$/, '')}/api/webhook/shopify`;
    const results = [];

    const neededTopics = new Set();
    for (const key of activeServiceKeys) {
      if (WEBHOOK_TOPICS[key]) {
        neededTopics.add(WEBHOOK_TOPICS[key]);
      }
    }

    const allServiceKeys = Object.keys(WEBHOOK_TOPICS);
    const inactiveTopics = new Set();
    for (const key of allServiceKeys) {
      if (!activeServiceKeys.includes(key)) {
        inactiveTopics.add(WEBHOOK_TOPICS[key]);
      }
    }

    for (const topic of neededTopics) {
      inactiveTopics.delete(topic);
    }

    for (const topic of neededTopics) {
      const result = await exports.registerWebhook(store, topic, webhookUrl);
      results.push({ topic, action: 'register', ...result });
    }

    for (const topic of inactiveTopics) {
      const result = await exports.unregisterWebhook(store, topic, webhookUrl);
      results.push({ topic, action: 'unregister', ...result });
    }

    return { success: true, message: 'Webhooks synced', data: results };
  } catch (error) {
    console.error('Error syncing webhooks:', error.message);
    return { success: false, message: error.message };
  }
};

exports.WEBHOOK_TOPICS = WEBHOOK_TOPICS;