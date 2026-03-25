const activityLogController = require('../controllers/activityLog.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView } = require('../utils/permissionChecker');

async function activityLogRoutes(fastify) {
  fastify.get('/all', { preHandler: [authMiddleware, canView('activity_log')] }, activityLogController.getAllLogs);
  fastify.get('/stats', { preHandler: [authMiddleware, canView('activity_log')] }, activityLogController.getLogStats);
}

module.exports = activityLogRoutes;