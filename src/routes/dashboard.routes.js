const dashboardController = require('../controllers/dashboard.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView } = require('../utils/permissionChecker');

async function dashboardRoutes(fastify) {
  fastify.get('/all', { preHandler: [authMiddleware, canView('dashboard')] }, dashboardController.getDashboard);
  fastify.get('/orders', { preHandler: [authMiddleware, canView('dashboard')] }, dashboardController.getOrderStats);
  fastify.get('/messages', { preHandler: [authMiddleware, canView('dashboard')] }, dashboardController.getMessageStats);
  fastify.get('/tags', { preHandler: [authMiddleware, canView('dashboard')] }, dashboardController.getTagStats);
  fastify.get('/stores', { preHandler: [authMiddleware, canView('dashboard')] }, dashboardController.getStoreBreakdown);
  fastify.get('/retry', { preHandler: [authMiddleware, canView('dashboard')] }, dashboardController.getRetryStats);
  fastify.get('/active-stores', { preHandler: [authMiddleware, canView('dashboard')] }, dashboardController.getActiveStores);
}

module.exports = dashboardRoutes;