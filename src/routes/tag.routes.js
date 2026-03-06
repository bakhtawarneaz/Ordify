const tagController = require('../controllers/tag.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function tagRoutes(fastify) {
  fastify.post('/create', { preHandler: [authMiddleware, canCreate('tag')] }, tagController.create);
  fastify.put('/update/:id', { preHandler: [authMiddleware, canEdit('tag')] }, tagController.update);
  fastify.delete('/delete/:id', { preHandler: [authMiddleware, canDelete('tag')] }, tagController.delete);
  fastify.get('/get/:id', { preHandler: authMiddleware }, tagController.getOne);
  fastify.get('/all', { preHandler: [authMiddleware, canView('tag')] }, tagController.getAll);
}

module.exports = tagRoutes;