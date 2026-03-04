const templateController = require('../controllers/template.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function templateRoutes(fastify) {
  fastify.post('/create', { preHandler: [authMiddleware, canCreate('template')] }, templateController.create);
  fastify.put('/update/:id', { preHandler: [authMiddleware, canEdit('template')] }, templateController.update);
  fastify.delete('/delete/:id', { preHandler: [authMiddleware, canDelete('template')] }, templateController.delete);
  fastify.get('/get/:id', { preHandler: authMiddleware }, templateController.getOne);
  fastify.get('/all', { preHandler: [authMiddleware, canView('template')] }, templateController.getAll);
  fastify.get('/store/:store_id', { preHandler: authMiddleware }, templateController.getByStore);
}

module.exports = templateRoutes;