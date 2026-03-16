const whatsappCallbackController = require('../controllers/whatsappCallback.controller');

async function whatsappCallbackRoutes(fastify) {
  fastify.post('/order-created', whatsappCallbackController.orderCreated);
  fastify.post('/callback', whatsappCallbackController.whatsappCallback);
}

module.exports = whatsappCallbackRoutes;