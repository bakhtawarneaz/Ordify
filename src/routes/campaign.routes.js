const campaignController = require('../controllers/campaign.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function campaignRoutes(fastify) {
  fastify.post('/create', { preHandler: [authMiddleware, canCreate('campaign')] }, campaignController.create);
  fastify.get('/all', { preHandler: [authMiddleware, canView('campaign')] }, campaignController.getAll);
  fastify.get('/get/:id', { preHandler: [authMiddleware, canView('campaign')] }, campaignController.getOne);
  fastify.put('/update/:id', { preHandler: [authMiddleware, canEdit('campaign')] }, campaignController.update);
  fastify.delete('/delete/:id', { preHandler: [authMiddleware, canDelete('campaign')] }, campaignController.delete);
  fastify.post('/regenerate-token/:id', { preHandler: [authMiddleware, canEdit('campaign')] }, campaignController.regenerateToken);
  fastify.get('/report/:id', { preHandler: [authMiddleware, canView('campaign')] }, campaignController.report);
  fastify.post('/store-dashboard', { preHandler: [authMiddleware, canView('campaign')] }, campaignController.storeDashboard);
  fastify.post('/status', { preHandler: [authMiddleware, canEdit('campaign')] }, campaignController.toggleStatus);
  fastify.get('/public/:code', { preHandler: [authMiddleware, canView('campaign')] }, campaignController.publicReport);
  fastify.get('/public/download/:code', { preHandler: [authMiddleware, canView('campaign')] }, campaignController.publicReportExcel);
}

module.exports = campaignRoutes;