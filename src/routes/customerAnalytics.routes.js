const controller = require('../controllers/customerAnalytics.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { canView } = require('../utils/permissionChecker');

async function customerAnalyticsRoutes(fastify) {
  fastify.get('/customer-detail', { preHandler: [authMiddleware, canView('customer_analytics')] }, controller.getCustomerDetail);
  fastify.get('/store-detail', { preHandler: [authMiddleware, canView('customer_analytics')] }, controller.getStoreDetail);
}

module.exports = customerAnalyticsRoutes;