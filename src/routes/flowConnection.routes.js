const flowConnectionController = require('../controllers/flowConnection.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function flowConnectionRoutes(fastify) {
  fastify.post('/create', { preHandler: authMiddleware }, flowConnectionController.create);
  fastify.put('/update/:id', { preHandler: authMiddleware }, flowConnectionController.update);
  fastify.delete('/delete/:id', { preHandler: authMiddleware }, flowConnectionController.delete);
  fastify.delete('/hard-delete/:id', { preHandler: authMiddleware }, flowConnectionController.hardDelete);
  fastify.get('/get/:id', { preHandler: authMiddleware }, flowConnectionController.getOne);
  fastify.get('/flow/:flowId', { preHandler: authMiddleware }, flowConnectionController.getFlowConnections);
  fastify.get('/node/:nodeId/outgoing', { preHandler: authMiddleware }, flowConnectionController.getNodeOutgoing);
  fastify.get('/node/:nodeId/incoming', { preHandler: authMiddleware }, flowConnectionController.getNodeIncoming);
  fastify.post('/bulk-create', { preHandler: authMiddleware }, flowConnectionController.bulkCreate);
  fastify.delete('/flow/:flowId', { preHandler: authMiddleware }, flowConnectionController.deleteFlowConnections);
  fastify.post('/replace', { preHandler: authMiddleware }, flowConnectionController.replaceConnections);
}

module.exports = flowConnectionRoutes;
