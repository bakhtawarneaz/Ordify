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