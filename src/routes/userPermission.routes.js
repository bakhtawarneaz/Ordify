const controller = require('../controllers/userPermission.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

async function routes(fastify) {
  fastify.post('/assign', { preHandler: authMiddleware }, controller.assign);
  fastify.get('/get/:user_id', { preHandler: authMiddleware }, controller.byUser);
}

module.exports = routes;