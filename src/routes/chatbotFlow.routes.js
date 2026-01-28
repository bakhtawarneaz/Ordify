const chatbotFlowController = require('../controllers/chatbotFlow.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function chatbotFlowRoutes(fastify) {

  fastify.post('/create', { preHandler: [authMiddleware, canCreate('chatbot_flow')] }, chatbotFlowController.create);
  fastify.put('/update/:id', { preHandler: [authMiddleware, canEdit('chatbot_flow')] }, chatbotFlowController.update);
  fastify.post('/status', { preHandler: [authMiddleware, canEdit('chatbot_flow')] }, chatbotFlowController.toggleStatus);
  fastify.delete('/delete/:id', { preHandler: [authMiddleware, canDelete('chatbot_flow')] }, chatbotFlowController.delete);
  fastify.get('/get/:id', { preHandler: [authMiddleware, canView('chatbot_flow')] }, chatbotFlowController.getOne);
  fastify.get('/all', { preHandler: [authMiddleware, canView('chatbot_flow')] }, chatbotFlowController.getAll);
  fastify.post('/duplicate/:id', { preHandler: [authMiddleware, canCreate('chatbot_flow')] }, chatbotFlowController.duplicate);
}

module.exports = chatbotFlowRoutes;