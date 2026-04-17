const service = require('../services/customerAnalytics.service');

exports.getCustomerDetail = async (req, reply) => {
  try {
    const res = await service.getCustomerDetail(req.query || {});
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getStoreDetail = async (req, reply) => {
  try {
    const res = await service.getStoreDetail(req.query || {});
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};