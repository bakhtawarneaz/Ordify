const orderService = require('../services/order.service');

exports.fetchOrders = async (req, reply) => {
  try {
    const res = await orderService.fetchOrders(req.query);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};