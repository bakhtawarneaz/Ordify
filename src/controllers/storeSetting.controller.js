const storeSettingService = require('../services/storeSetting.service');

exports.addSetting = async (req, reply) => {
  try {
    const res = await storeSettingService.addSetting(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.updateSetting = async (req, reply) => {
  try {
    const res = await storeSettingService.updateSetting(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
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

exports.bulkAddSettings = async (req, reply) => {
  try {
    const res = await storeSettingService.bulkAddSettings(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.bulkUpdateSettings = async (req, reply) => {
  try {
    const res = await storeSettingService.bulkUpdateSettings(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getByStore = async (req, reply) => {
  try {
    const res = await storeSettingService.getByStore(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};