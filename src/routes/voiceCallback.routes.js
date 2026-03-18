const voiceCallbackController = require('../controllers/voiceCallback.controller');

async function voiceCallbackRoutes(fastify) {
  fastify.post('/callback', voiceCallbackController.voiceCallback);
}

module.exports = voiceCallbackRoutes;