const controller = require('../controllers/store.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

async function routes(fastify) {
  fastify.post('/add', { preHandler: authMiddleware }, controller.add);
  fastify.get('/all', { preHandler: authMiddleware }, controller.allStores);
  fastify.get('/get/:id', { preHandler: authMiddleware }, controller.byId);
}

module.exports = routes;