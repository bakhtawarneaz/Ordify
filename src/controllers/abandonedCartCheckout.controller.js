const service = require('../services/abandonedCartCheckout.service');

exports.getCheckouts = async (req, reply) => {
  try {
    const res = await service.getCheckouts(req.params.store_id, req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.sendManualReminder = async (req, reply) => {
  try {
    const res = await service.sendManualReminder(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};