const retryQueueController = require('../controllers/retryQueue.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView } = require('../utils/permissionChecker');

async function retryQueueRoutes(fastify) {
  fastify.get('/all', { preHandler: [authMiddleware, canView('retry_queue')] }, retryQueueController.getAllRetryQueue);
  fastify.post('/retry/:id', { preHandler: [authMiddleware] }, retryQueueController.retrySingle);
  fastify.post('/retry-bulk', { preHandler: [authMiddleware] }, retryQueueController.retryBulk);
}

module.exports = retryQueueRoutes;