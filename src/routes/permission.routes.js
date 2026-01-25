const permissionController = require('../controllers/permission.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

async function permissionRoutes(fastify) {
  fastify.post('/create', { preHandler: authMiddleware }, permissionController.assign);
  fastify.get('/get/:role_id', { preHandler: authMiddleware }, permissionController.byRole);
  fastify.delete('/delete/:id', { preHandler: authMiddleware }, permissionController.remove);
}

module.exports = permissionRoutes;