const activityLogService = require('../services/activityLog.service');

exports.getAllLogs = async (req, reply) => {
  try {
    const res = await activityLogService.getAllLogs(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getLogStats = async (req, reply) => {
  try {
    const res = await activityLogService.getLogStats(req.query.store_id);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};