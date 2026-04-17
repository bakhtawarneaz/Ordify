const service = require('../services/abandonedCartConfig.service');

exports.getConfigs = async (req, reply) => {
  try {
    const res = await service.getConfigs(req.query || {});
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.saveConfig = async (req, reply) => {
  try {
    const res = await service.saveConfig(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};