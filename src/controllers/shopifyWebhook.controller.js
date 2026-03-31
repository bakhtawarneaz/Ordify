const shopifyWebhookService = require('../services/shopifyWebhook.service');

exports.shopifyWebhook = async (req, reply) => {
  try {
    const topic = req.headers['x-shopify-topic'] || '';
    reply.code(200).send({ success: true, message: 'Webhook received' });
    shopifyWebhookService.handleShopifyWebhook(req.body, topic)
      .catch(err => {
        console.error(`Webhook processing error [${topic}]:`, err.message);
      });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};