const orderController = require('../controllers/order.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView } = require('../utils/permissionChecker');

async function orderRoutes(fastify) {
  fastify.get('/list', { preHandler: [authMiddleware, canView('order')] }, orderController.fetchOrders);
}

module.exports = orderRoutes;