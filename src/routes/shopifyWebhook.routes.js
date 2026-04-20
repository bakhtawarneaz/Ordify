const shopifyWebhookController = require('../controllers/shopifyWebhook.controller');
const { verifyShopifyWebhook } = require('../middlewares/shopifyWebhook.middleware');

async function shopifyWebhookRoutes(fastify) {
  fastify.post('/order_create', { preHandler: [verifyShopifyWebhook] }, shopifyWebhookController.shopifyWebhookOrderCreate);
  fastify.post('/order_fulfilled', { preHandler: [verifyShopifyWebhook] }, shopifyWebhookController.shopifyWebhookFulfilled);
  fastify.post('/order_paid', { preHandler: [verifyShopifyWebhook] }, shopifyWebhookController.shopifyWebhookPaid);
  fastify.post('/order_updated', { preHandler: [verifyShopifyWebhook] }, shopifyWebhookController.shopifyWebhookUpdated);
}

module.exports = shopifyWebhookRoutes;