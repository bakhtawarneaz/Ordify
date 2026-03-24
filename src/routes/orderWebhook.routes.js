const orderWebhookController = require('../controllers/orderWebhook.controller');

async function orderWebhookRoutes(fastify) {
  fastify.post('/order-created', orderWebhookController.orderCreated);
}

module.exports = orderWebhookRoutes;