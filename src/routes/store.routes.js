const storeController = require('../controllers/store.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function storeRoutes(fastify) {
  fastify.post('/create', { preHandler: [authMiddleware, canCreate('store')] }, storeController.create);
  fastify.put('/update/:id', { preHandler: [authMiddleware, canEdit('store')] }, storeController.update);
  fastify.delete('/delete/:id', { preHandler: [authMiddleware, canDelete('store')] }, storeController.delete);
  fastify.get('/get/:id', { preHandler: authMiddleware }, storeController.getOne);
  fastify.get('/all', { preHandler: [authMiddleware, canView('store')] }, storeController.getAll);
}

module.exports = storeRoutes;