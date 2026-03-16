const messageLogService = require('../services/messageLog.service');

exports.getAllLogs = async (req, reply) => {
  try {
    const res = await messageLogService.getAllLogs(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.retrySingle = async (req, reply) => {
  try {
    const res = await messageLogService.retrySingle(req.params.id);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.retryBulk = async (req, reply) => {
  try {
    const res = await messageLogService.retryBulk(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};