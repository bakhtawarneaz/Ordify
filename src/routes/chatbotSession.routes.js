const chatbotSessionController = require('../controllers/chatbotSession.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function chatbotSessionRoutes(fastify) {
  fastify.post('/create', { preHandler: authMiddleware }, chatbotSessionController.create);
  fastify.get('/get/:id', { preHandler: authMiddleware }, chatbotSessionController.getOne);
  fastify.get('/active/:phoneNumber', { preHandler: authMiddleware }, chatbotSessionController.getActiveByPhone);
  fastify.put('/update/:id', { preHandler: authMiddleware }, chatbotSessionController.update);
  fastify.put('/node/:id', { preHandler: authMiddleware }, chatbotSessionController.updateCurrentNode);
  fastify.put('/status/:id', { preHandler: authMiddleware }, chatbotSessionController.setStatus);
  fastify.put('/variable/:id', { preHandler: authMiddleware }, chatbotSessionController.setVariable);
  fastify.put('/variables/:id', { preHandler: authMiddleware }, chatbotSessionController.setVariables);
  fastify.get('/variable/:id/:key', { preHandler: authMiddleware }, chatbotSessionController.getVariable);
  fastify.get('/variables/:id', { preHandler: authMiddleware }, chatbotSessionController.getAllVariables);
  fastify.post('/end/:id', { preHandler: authMiddleware }, chatbotSessionController.endSession);
  fastify.post('/end-phone/:phoneNumber', { preHandler: authMiddleware }, chatbotSessionController.endByPhone);
  fastify.get('/flow/:flowId', { preHandler: authMiddleware }, chatbotSessionController.getFlowSessions);
  fastify.get('/all', { preHandler: authMiddleware }, chatbotSessionController.getAll);
  fastify.post('/cleanup', { preHandler: authMiddleware }, chatbotSessionController.cleanup);
  fastify.get('/stats', { preHandler: authMiddleware }, chatbotSessionController.getStats);
}

module.exports = chatbotSessionRoutes;
