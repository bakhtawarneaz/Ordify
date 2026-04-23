const storeSettingController = require('../controllers/storeSetting.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function storeSettingRoutes(fastify) {
  fastify.post('/add', { preHandler: [authMiddleware, canCreate('store_setting')] }, storeSettingController.addSetting);
  fastify.post('/update', { preHandler: [authMiddleware, canEdit('store_setting')] }, storeSettingController.updateSetting);
  fastify.post('/delete', { preHandler: [authMiddleware, canDelete('store_setting')] }, storeSettingController.deleteSetting);
  fastify.post('/bulk-add', { preHandler: [authMiddleware, canCreate('store_setting')] }, storeSettingController.bulkAddSettings);
  fastify.post('/bulk-update', { preHandler: [authMiddleware, canEdit('store_setting')] }, storeSettingController.bulkUpdateSettings);
  fastify.get('/all', { preHandler: [authMiddleware, canView('store_setting')] }, storeSettingController.getByStore);
}

module.exports = storeSettingRoutes;