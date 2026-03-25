const retryQueueService = require('../services/retryQueue.service');

exports.getAllRetryQueue = async (req, reply) => {
  try {
    const res = await retryQueueService.getAllRetryQueue(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.retrySingle = async (req, reply) => {
  try {
    const res = await retryQueueService.retrySingle(req.params.id);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.retryBulk = async (req, reply) => {
  try {
    const res = await retryQueueService.retryBulk(req.body || {}, req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};