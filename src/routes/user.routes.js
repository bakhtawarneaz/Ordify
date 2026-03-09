const userController = require('../controllers/user.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function userRoutes(fastify) {
  fastify.post('/create', { preHandler: [authMiddleware, canCreate('user')] }, userController.create);
  fastify.put('/update/:id', { preHandler: [authMiddleware, canEdit('user')] }, userController.update);
  fastify.delete('/delete/:id', { preHandler: [authMiddleware, canDelete('user')] }, userController.delete);
  fastify.get('/get/:id', { preHandler: authMiddleware }, userController.getOne);
  fastify.get('/all', { preHandler: [authMiddleware, canView('user')] }, userController.getAll);
  fastify.patch('/toggle-status/:id', { preHandler: [authMiddleware, canEdit('user')] }, userController.toggleStatus);
}

module.exports = userRoutes;