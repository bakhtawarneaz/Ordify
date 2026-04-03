const storeSettingService = require('../services/storeSetting.service');

exports.updateServices = async (req, reply) => {
  try {
    const res = await storeSettingService.updateServices(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getByStore = async (req, reply) => {
  try {
    const res = await storeSettingService.getServicesByStore(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getSetting = async (req, reply) => {
  try {
    const value = await storeSettingService.getSetting(req.query.store_id, req.query.setting_key);
    return reply.code(200).send({ success: true, data: value });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.setSetting = async (req, reply) => {
  try {
    const res = await storeSettingService.setSetting(req.body.store_id, req.body.setting_key, req.body.setting_value);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.deleteSetting = async (req, reply) => {
  try {
    const res = await storeSettingService.deleteSetting(req.body.store_id, req.body.setting_key);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};