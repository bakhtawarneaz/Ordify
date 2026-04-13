const shopifyWebhookController = require('../controllers/shopifyWebhook.controller');
const { verifyShopifyWebhook } = require('../middlewares/shopifyWebhook.middleware');

async function shopifyWebhookRoutes(fastify) {
  fastify.post('/shopify_order_create', { preHandler: [verifyShopifyWebhook] }, shopifyWebhookController.shopifyWebhookOrderCreate);
  fastify.post('/shopify_fulfilled', { preHandler: [verifyShopifyWebhook] }, shopifyWebhookController.shopifyWebhookFulfilled);
  fastify.post('/shopify_paid', { preHandler: [verifyShopifyWebhook] }, shopifyWebhookController.shopifyWebhookPaid);
  fastify.post('/shopify_updated', { preHandler: [verifyShopifyWebhook] }, shopifyWebhookController.shopifyWebhookUpdated);
}

module.exports = shopifyWebhookRoutes;