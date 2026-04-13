const shopifyWebhookService = require('../services/shopifyWebhook.service');

exports.shopifyWebhookOrderCreate = async (req, reply) => {
  try {
    reply.code(200).send({ success: true, message: 'Webhook received' });
    shopifyWebhookService.handleShopifyWebhook(req.body, 'orders/create')
      .catch(err => {
        console.error('Webhook processing error [orders/create]:', err.message);
      });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.shopifyWebhookFulfilled = async (req, reply) => {
  try {
    reply.code(200).send({ success: true, message: 'Webhook received' });
    shopifyWebhookService.handleShopifyWebhook(req.body, 'orders/fulfilled')
      .catch(err => {
        console.error('Webhook processing error [orders/fulfilled]:', err.message);
      });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.shopifyWebhookPaid = async (req, reply) => {
  try {
    reply.code(200).send({ success: true, message: 'Webhook received' });
    shopifyWebhookService.handleShopifyWebhook(req.body, 'orders/paid')
      .catch(err => {
        console.error('Webhook processing error [orders/paid]:', err.message);
      });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.shopifyWebhookUpdated = async (req, reply) => {
  try {
    reply.code(200).send({ success: true, message: 'Webhook received' });
    shopifyWebhookService.handleShopifyWebhook(req.body, 'orders/updated')
      .catch(err => {
        console.error('Webhook processing error [orders/updated]:', err.message);
      });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};