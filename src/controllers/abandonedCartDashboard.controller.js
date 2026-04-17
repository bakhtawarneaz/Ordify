const service = require('../services/abandonedCartDashboard.service');

exports.getMessageLogs = async (req, reply) => {
  try {
    const res = await service.getMessageLogs(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};