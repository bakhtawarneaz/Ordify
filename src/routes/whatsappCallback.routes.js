const whatsappCallbackController = require('../controllers/whatsappCallback.controller');

async function whatsappCallbackRoutes(fastify) {
  fastify.post('/callback', whatsappCallbackController.whatsappCallback);
}

module.exports = whatsappCallbackRoutes;