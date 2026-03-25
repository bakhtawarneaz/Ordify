const shopifyWebhookService = require('../services/shopifyWebhook.service');

exports.shopifyWebhook = async (req, reply) => {
  try {
    const topic = req.headers['x-shopify-topic'] || '';
    const res = await shopifyWebhookService.handleShopifyWebhook(req.body, topic);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};