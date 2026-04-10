const StoreSetting = require('../models/storeSetting.model');
const Store = require('../models/store.model');

exports.addSetting = async (payload) => {
  const { store_id, setting_key, is_active } = payload;

  if (!store_id || !setting_key) {
    return { success: false, message: 'store_id and setting_key are required' };
  }

  const store = await Store.findOne({ where: { id: store_id } });
  if (!store) {
    return { success: false, message: 'Store not found' };
  }

  const existing = await StoreSetting.findOne({
    where: { store_id, setting_key },
  });

  if (existing) {
    return { success: false, message: 'Setting already exists' };
  }

  const created = await StoreSetting.create({
    store_id,
    setting_key,
    is_active: is_active !== undefined ? is_active : false,
  });

  return { success: true, message: 'Setting created', data: created };
};

exports.updateSetting = async (payload) => {
  const { store_id, setting_key, is_active } = payload;

  if (!store_id || !setting_key) {
    return { success: false, message: 'store_id and setting_key are required' };
  }

  const existing = await StoreSetting.findOne({
    where: { store_id, setting_key },
  });

  if (!existing) {
    return { success: false, message: 'Setting not found' };
  }

  await existing.update({ is_active });
  return { success: true, message: 'Setting updated', data: existing };
};

exports.deleteSetting = async (store_id, setting_key) => {
  const setting = await StoreSetting.findOne({
    where: { store_id, setting_key },
  });

  if (!setting) {
    return { success: false, message: 'Setting not found' };
  }

  await setting.destroy();
  return { success: true, message: 'Setting deleted' };
};

exports.bulkAddSettings = async (payload) => {
  const { store_id, settings } = payload;

  if (!store_id || !settings || !Array.isArray(settings) || settings.length === 0) {
    return { success: false, message: 'store_id and settings array are required' };
  }

  const store = await Store.findOne({ where: { id: store_id } });
  if (!store) return { success: false, message: 'Store not found' };

  const results = [];

  for (const item of settings) {
    const existing = await StoreSetting.findOne({
      where: { store_id, setting_key: item.setting_key },
    });

    if (existing) {
      results.push({ setting_key: item.setting_key, status: 'already_exists' });
      continue;
    }

    await StoreSetting.create({
      store_id,
      setting_key: item.setting_key,
      is_active: item.is_active !== undefined ? item.is_active : false,
    });

    results.push({ setting_key: item.setting_key, status: 'created' });
  }

  return {
    success: true,
    message: `${results.filter(r => r.status === 'created').length} settings added`,
    data: results,
  };
};

exports.getByStore = async (query) => {
  const where = {};
  if (query.store_id) {
    where.store_id = query.store_id;
  }
  const settings = await StoreSetting.findAll({
    where,
    include: [{ model: Store, attributes: ['id', 'store_name', 'store_url'] }],
    order: [['id', 'ASC']],
  });
  return { success: true, data: settings };
};

exports.getActiveServices = async (store_id) => {
  const services = await StoreSetting.findAll({
    where: { store_id, is_active: true },
  });
  const activeKeys = services.map(s => s.setting_key);
  return {
    isActive: (key) => activeKeys.includes(key),
    activeKeys,
  };
};

exports.isServiceActive = async (store_id, service_key) => {
  const service = await StoreSetting.findOne({
    where: { store_id, setting_key: service_key, is_active: true },
  });
  return !!service;
};