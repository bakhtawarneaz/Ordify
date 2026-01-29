const chatbotFlowController = require('../controllers/chatbotFlow.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView, canCreate, canEdit, canDelete } = require('../utils/permissionChecker');

async function chatbotFlowRoutes(fastify) {

  fastify.post('/create', { preHandler: authMiddleware }, chatbotFlowController.create);
  fastify.put('/update/:id', chatbotFlowController.update);
  fastify.post('/status', chatbotFlowController.toggleStatus);
  fastify.delete('/delete/:id', chatbotFlowController.delete);
  fastify.get('/get/:id', chatbotFlowController.getOne);
  fastify.get('/all', chatbotFlowController.getAll);
  fastify.post('/duplicate/:id', chatbotFlowController.duplicate);
}

module.exports = chatbotFlowRoutes;