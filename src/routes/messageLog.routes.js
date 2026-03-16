const messageLogController = require('../controllers/messageLog.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView } = require('../utils/permissionChecker');

async function messageLogRoutes(fastify) {
  fastify.get('/all', { preHandler: [authMiddleware, canView('message_log')] }, messageLogController.getAllLogs);
  fastify.post('/retry/:id', { preHandler: [authMiddleware] }, messageLogController.retrySingle);
  fastify.post('/retry-bulk', { preHandler: [authMiddleware] }, messageLogController.retryBulk);
}

module.exports = messageLogRoutes;