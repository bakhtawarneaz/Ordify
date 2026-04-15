const service = require('../services/abandonedCartLog.service');

exports.getMessageLogs = async (req, reply) => {
  try {
    const res = await service.getMessageLogs(req.params.store_id, req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};