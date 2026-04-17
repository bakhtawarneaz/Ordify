const templateController = require('../controllers/abandonedCartTemplate.controller');
const configController = require('../controllers/abandonedCartConfig.controller');
const dashboardController = require('../controllers/abandonedCartDashboard.controller');
const checkoutController = require('../controllers/abandonedCartCheckout.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function abandonedCartRoutes(fastify) {
  // ---- Template ----
  fastify.post('/template/create', { preHandler: [authMiddleware, canCreate('abandoned_cart')] }, templateController.create);
  fastify.put('/template/update/:id', { preHandler: [authMiddleware, canEdit('abandoned_cart')] }, templateController.update);
  fastify.delete('/template/delete/:id', { preHandler: [authMiddleware, canDelete('abandoned_cart')] }, templateController.delete);
  fastify.get('/template/get/:id', { preHandler: [authMiddleware] }, templateController.getOne);
  fastify.get('/template/all', { preHandler: [authMiddleware, canView('abandoned_cart')] }, templateController.getAll);

  // ---- Config ----
  fastify.get('/config/all', { preHandler: [authMiddleware, canView('abandoned_cart')] }, configController.getConfigs);
  fastify.post('/config/save', { preHandler: [authMiddleware, canEdit('abandoned_cart')] }, configController.saveConfig);

  // ---- Dashboard ----
  fastify.get('/dashboard/all', { preHandler: [authMiddleware, canView('abandoned_cart')] }, dashboardController.getMessageLogs);

  // ---- Checkouts ----
  fastify.get('/checkouts/all', { preHandler: [authMiddleware, canView('abandoned_cart')] }, checkoutController.getCheckouts);

  // ---- Manual Reminder ----
  fastify.post('/send-reminder', { preHandler: [authMiddleware, canCreate('abandoned_cart')] }, checkoutController.sendManualReminder);
}

module.exports = abandonedCartRoutes;