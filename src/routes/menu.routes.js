const menuController = require('../controllers/menu.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function menuRoutes(fastify) {
  fastify.post('/create', { preHandler: [authMiddleware, canCreate('dashboard')] }, menuController.create);
  fastify.put('/update/:id', { preHandler: [authMiddleware, canEdit('dashboard')] }, menuController.update);
  fastify.post('/status', { preHandler: [authMiddleware, canDelete('dashboard')] }, menuController.toggleStatus);
  fastify.get('/get/:id', { preHandler: authMiddleware }, menuController.getOne);
  fastify.get('/all', { preHandler: [authMiddleware, canView('dashboard')] }, menuController.getAll);
}

module.exports = menuRoutes;