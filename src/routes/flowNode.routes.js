const flowNodeController = require('../controllers/flowNode.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function flowNodeRoutes(fastify) {
  fastify.get('/templates', { preHandler: authMiddleware }, flowNodeController.getTemplates);
  fastify.post('/create', { preHandler: authMiddleware }, flowNodeController.create);
  fastify.put('/update/:id', { preHandler: authMiddleware }, flowNodeController.update);
  fastify.put('/position/:id', { preHandler: authMiddleware }, flowNodeController.updatePosition);
  fastify.put('/config/:id', { preHandler: authMiddleware }, flowNodeController.updateConfig);
  fastify.delete('/delete/:id', { preHandler: authMiddleware }, flowNodeController.delete);
  fastify.get('/get/:id', { preHandler: authMiddleware }, flowNodeController.getOne);
  fastify.get('/flow/:flowId', { preHandler: authMiddleware }, flowNodeController.getFlowNodes);
  fastify.post('/bulk-position', { preHandler: authMiddleware }, flowNodeController.bulkUpdatePositions);
}

module.exports = flowNodeRoutes; 