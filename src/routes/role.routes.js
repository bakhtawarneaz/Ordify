const roleController = require('../controllers/role.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function roleRoutes(fastify) {
  fastify.post('/create', { preHandler: [authMiddleware, canCreate('role')] }, roleController.create);
  fastify.put('/update/:id', { preHandler: [authMiddleware, canEdit('role')] }, roleController.update);
  fastify.delete('/delete/:id', { preHandler: [authMiddleware, canDelete('role')] }, roleController.delete);
  fastify.get('/get/:id', { preHandler: authMiddleware }, roleController.getOne);
  fastify.get('/all', { preHandler: [authMiddleware, canView('role')] }, roleController.getAll);
}

module.exports = roleRoutes;