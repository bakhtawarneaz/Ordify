const storeSettingController = require('../controllers/storeSetting.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function storeSettingRoutes(fastify) {
  fastify.post('/update', { preHandler: [authMiddleware, canEdit('store_setting')] }, storeSettingController.updateServices);
  fastify.get('/all', { preHandler: [authMiddleware, canView('store_setting')] }, storeSettingController.getByStore);
  fastify.get('/setting', { preHandler: [authMiddleware, canView('store_setting')] }, storeSettingController.getSetting);
  fastify.post('/setting', { preHandler: [authMiddleware, canEdit('store_setting')] }, storeSettingController.setSetting);
  fastify.post('/setting/delete', { preHandler: [authMiddleware, canDelete('store_setting')] }, storeSettingController.deleteSetting);
}

module.exports = storeSettingRoutes;