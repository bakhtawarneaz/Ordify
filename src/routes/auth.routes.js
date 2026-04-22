const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

async function authRoutes(fastify, options) {
  fastify.post('/register', authController.register);
  fastify.post('/login', authController.login);
  fastify.post('/forgot-password', authController.sendForgotPasswordOtp);
  fastify.post('/verify-otp', authController.verifyOtp);
  fastify.post('/reset-password', authController.resetPassword);
  fastify.post('/change-password', { preHandler: authMiddleware }, authController.changePassword);
}

module.exports = authRoutes; 