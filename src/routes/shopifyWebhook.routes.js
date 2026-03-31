const shopifyWebhookController = require('../controllers/shopifyWebhook.controller');
const { verifyShopifyWebhook } = require('../middlewares/shopifyWebhook.middleware');

async function shopifyWebhookRoutes(fastify) {
  fastify.post('/shopify', { preHandler: [verifyShopifyWebhook] }, shopifyWebhookController.shopifyWebhook);
}

module.exports = shopifyWebhookRoutes;