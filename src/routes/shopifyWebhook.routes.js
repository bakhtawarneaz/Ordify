const shopifyWebhookController = require('../controllers/shopifyWebhook.controller');

async function shopifyWebhookRoutes(fastify) {
  fastify.post('/shopify', shopifyWebhookController.shopifyWebhook);
}

module.exports = shopifyWebhookRoutes;