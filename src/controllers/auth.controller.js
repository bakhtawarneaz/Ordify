const authService = require('../services/auth.service');


exports.register = async (req, reply) => {
  try {
    const response = await authService.register(req.body);
    reply.code(response.success ? 200 : 400).send(response);
  } catch (err) {
    reply.code(500).send({ success: false, message: err.message });
  }
};

exports.login = async (req, reply) => {
  try {
    const response = await authService.login(req.body);
    reply.code(response.success ? 200 : 400).send(response);
  } catch (err) {
    reply.code(500).send({ success: false, message: err.message });
  }
};

exports.sendForgotPasswordOtp = async (req, reply) => {
  try {
    const response = await authService.sendForgotPasswordOtp(req.body);
    reply.code(response.success ? 200 : 400).send(response);
  } catch (err) {
    reply.code(500).send({ success: false, message: err.message });
  }
};

exports.verifyOtp = async (req, reply) => {
  try {
    const response = await authService.verifyOtp(req.body);
    reply.code(response.success ? 200 : 400).send(response);
  } catch (err) {
    reply.code(500).send({ success: false, message: err.message });
  }
};

exports.resetPassword = async (req, reply) => {
  try {
    const response = await authService.resetPassword(req.body);
    reply.code(response.success ? 200 : 400).send(response);
  } catch (err) {
    reply.code(500).send({ success: false, message: err.message });
  }
};

exports.changePassword = async (req, reply) => {
  try {
    const userId = req.user.id;  // middleware se aayega
    const response = await authService.changePassword(userId, req.body);
    reply.code(response.success ? 200 : 400).send(response);
  } catch (err) {
    reply.code(500).send({ success: false, message: err.message });
  }
};