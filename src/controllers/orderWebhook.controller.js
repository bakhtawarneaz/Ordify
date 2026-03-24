const orderWebhookService = require('../services/orderWebhook.service');

exports.orderCreated = async (req, reply) => {
  try {
    const res = await orderWebhookService.handleOrderCreated(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};