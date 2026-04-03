const feedbackController = require('../controllers/feedback.controller');

async function feedbackRoutes(fastify) {
  fastify.post('/callback', feedbackController.feedbackCallback);
}

module.exports = feedbackRoutes;