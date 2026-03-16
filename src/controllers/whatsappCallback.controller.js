const whatsappCallbackService = require('../services/whatsappCallback.service');

exports.orderCreated = async (req, reply) => {
  try {
    const res = await whatsappCallbackService.handleOrderCreated(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.whatsappCallback = async (req, reply) => {
  try {
    const res = await whatsappCallbackService.handleWhatsAppCallback(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};