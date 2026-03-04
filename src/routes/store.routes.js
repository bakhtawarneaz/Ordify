const controller = require('../controllers/store.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

async function routes(fastify) {
  fastify.post('/add', { preHandler: authMiddleware }, controller.add);
  // fastify.get('/get/:user_id', { preHandler: authMiddleware }, controller.byUser);
}

module.exports = routes;