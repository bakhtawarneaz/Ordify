const flowExecutionController = require('../controllers/flowExecution.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canCreate, canEdit } = require('../utils/permissionChecker');

async function flowExecutionRoutes(fastify) {
  // WhatsApp Webhook (GET for verification, POST for messages)
  // No auth required - WhatsApp sends directly
  fastify.get('/webhook', flowExecutionController.handleWebhook);
  fastify.post('/webhook', flowExecutionController.handleWebhook);

  // Manually trigger a flow
  fastify.post('/trigger', { preHandler: authMiddleware }, flowExecutionController.triggerFlow);

  // End a session manually
  fastify.post('/end-session', { preHandler: authMiddleware }, flowExecutionController.endSession);

  // Test endpoint - simulate incoming message (for development)
  fastify.post('/simulate', { preHandler: authMiddleware }, flowExecutionController.simulateMessage);
}

module.exports = flowExecutionRoutes;