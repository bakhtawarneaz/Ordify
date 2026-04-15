const templateController = require('../controllers/abandonedCartTemplate.controller');
const configController = require('../controllers/abandonedCartConfig.controller');
const dashboardController = require('../controllers/abandonedCartDashboard.controller');
const logController = require('../controllers/abandonedCartLog.controller');
const checkoutController = require('../controllers/abandonedCartCheckout.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function abandonedCartRoutes(fastify) {
  // ---- Template ----
  fastify.post('/template/create', { preHandler: [authMiddleware, canCreate('abandoned_cart')] }, templateController.create);
  fastify.put('/template/update/:id', { preHandler: [authMiddleware, canEdit('abandoned_cart')] }, templateController.update);
  fastify.delete('/template/delete/:id', { preHandler: [authMiddleware, canDelete('abandoned_cart')] }, templateController.deleteTemplate);
  fastify.get('/template/get/:id', { preHandler: [authMiddleware] }, templateController.getOne);
  fastify.get('/template/all', { preHandler: [authMiddleware, canView('abandoned_cart')] }, templateController.getAll);

  // ---- Config ----
  fastify.get('/config/:store_id', { preHandler: [authMiddleware, canView('abandoned_cart')] }, configController.getConfig);
  fastify.post('/config/:store_id', { preHandler: [authMiddleware, canEdit('abandoned_cart')] }, configController.saveConfig);

  // ---- Dashboard ----
  fastify.get('/dashboard/:store_id', { preHandler: [authMiddleware, canView('abandoned_cart')] }, dashboardController.getDashboard);

  // ---- Message Logs ----
  fastify.get('/logs/:store_id', { preHandler: [authMiddleware, canView('abandoned_cart')] }, logController.getMessageLogs);

  // ---- Checkouts ----
  fastify.get('/checkouts/:store_id', { preHandler: [authMiddleware, canView('abandoned_cart')] }, checkoutController.getCheckouts);

  // ---- Manual Reminder ----
  fastify.post('/send-reminder', { preHandler: [authMiddleware, canCreate('abandoned_cart')] }, checkoutController.sendManualReminder);
}

module.exports = abandonedCartRoutes;