const storeServiceController = require('../controllers/storeService.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canEdit } = require('../utils/permissionChecker');

async function storeServiceRoutes(fastify) {
    fastify.post('/update', { preHandler: [authMiddleware, canEdit('store_service')] }, storeServiceController.updateServices);
    fastify.get('/store/:store_id', { preHandler: [authMiddleware, canView('store_service')] }, storeServiceController.getByStore);
  }

module.exports = storeServiceRoutes;