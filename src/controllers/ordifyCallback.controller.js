const ordifyCallbackService = require('../services/ordifyCallback.service');

exports.ordifyCallback = async (req, reply) => {
  try {
    const res = await ordifyCallbackService.handleOrdifyCallback(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};