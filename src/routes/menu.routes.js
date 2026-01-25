const menuController = require('../controllers/menu.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

async function menuRoutes(fastify) {
  fastify.post('/create', { preHandler: authMiddleware }, menuController.create);
  fastify.put('/update/:id', { preHandler: authMiddleware }, menuController.update);
  fastify.delete('/delete/:id', { preHandler: authMiddleware }, menuController.remove);
  fastify.get('/get/:id', { preHandler: authMiddleware }, menuController.getOne);
  fastify.get('/all', { preHandler: authMiddleware }, menuController.getAll);
}

module.exports = menuRoutes;