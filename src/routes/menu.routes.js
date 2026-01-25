const menuController = require('../controllers/menu.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function menuRoutes(fastify) {
  fastify.post('/create', { preHandler: [authMiddleware, canCreate('menu')] }, menuController.create);
  fastify.put('/update/:id', { preHandler: [authMiddleware, canEdit('menu')] }, menuController.update);
  fastify.post('/status', { preHandler: [authMiddleware, canDelete('menu')] }, menuController.toggleStatus);
  fastify.get('/get/:id', { preHandler: authMiddleware }, menuController.getOne);
  fastify.get('/all', { preHandler: [authMiddleware, canView('menu')] }, menuController.getAll);
  fastify.get('/sidebar', { preHandler: authMiddleware }, menuController.myMenus);
}

module.exports = menuRoutes;