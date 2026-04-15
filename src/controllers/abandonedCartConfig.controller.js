const service = require('../services/abandonedCartConfig.service');

exports.getConfig = async (req, reply) => {
  try {
    const res = await service.getConfig(req.params.store_id);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.saveConfig = async (req, reply) => {
  try {
    const res = await service.saveConfig(req.params.store_id, req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};