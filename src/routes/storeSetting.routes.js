const storeSettingController = require('../controllers/storeSetting.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function storeSettingRoutes(fastify) {
  // Service routes
  fastify.post('/service/add', { preHandler: [authMiddleware, canCreate('store_setting')] }, storeSettingController.addServices);
  fastify.post('/service/update', { preHandler: [authMiddleware, canEdit('store_setting')] }, storeSettingController.updateServices);

  // Setting routes
  fastify.post('/setting/add', { preHandler: [authMiddleware, canCreate('store_setting')] }, storeSettingController.addSetting);
  fastify.post('/setting/update', { preHandler: [authMiddleware, canEdit('store_setting')] }, storeSettingController.updateSetting);
  fastify.get('/setting/get', { preHandler: [authMiddleware, canView('store_setting')] }, storeSettingController.getSetting);
  fastify.post('/setting/delete', { preHandler: [authMiddleware, canDelete('store_setting')] }, storeSettingController.deleteSetting);

  // Get all (services + settings)
  fastify.get('/all', { preHandler: [authMiddleware, canView('store_setting')] }, storeSettingController.getByStore);
}

module.exports = storeSettingRoutes;