const ordifyCallbackController = require('../controllers/ordifyCallback.controller');

async function ordifyCallbackRoutes(fastify) {
  fastify.post('/callback', ordifyCallbackController.ordifyCallback);
}

module.exports = ordifyCallbackRoutes;