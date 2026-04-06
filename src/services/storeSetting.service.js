const StoreSetting = require('../models/storeSetting.model');
const Store = require('../models/store.model');


exports.addServices = async (payload) => {
  const { store_id, services } = payload;

  if (!store_id) {
    return { success: false, message: 'store_id is required' };
  }

  if (!services || !Array.isArray(services) || services.length === 0) {
    return { success: false, message: 'services array is required' };
  }

  const store = await Store.findOne({ where: { id: store_id } });
  if (!store) {
    return { success: false, message: 'Store not found' };
  }

  const results = [];

  for (const svc of services) {
    const { service_key, is_active } = svc;

    const existing = await StoreSetting.findOne({
      where: { store_id, setting_key: service_key },
    });

    if (existing) {
      results.push({ service_key, status: 'already_exists' });
      continue;
    }

    await StoreSetting.create({ store_id, setting_key: service_key, is_active: is_active || false });
    results.push({ service_key, status: 'created' });
  }

  return {
    success: true,
    message: `${results.filter(r => r.status === 'created').length} services added`,
    data: results,
  };
};

exports.updateServices = async (payload) => {
  const { store_id, services } = payload;

  if (!store_id) {
    return { success: false, message: 'store_id is required' };
  }

  if (!services || !Array.isArray(services) || services.length === 0) {
    return { success: false, message: 'services array is required' };
  }

  const store = await Store.findOne({ where: { id: store_id } });
  if (!store) {
    return { success: false, message: 'Store not found' };
  }

  const results = [];

  for (const svc of services) {
    const { service_key, is_active } = svc;

    const existing = await StoreSetting.findOne({
      where: { store_id, setting_key: service_key },
    });

    if (!existing) {
      results.push({ service_key, status: 'not_found' });
      continue;
    }

    await existing.update({ is_active });
    results.push({ service_key, status: 'updated' });
  }

  return {
    success: true,
    message: `${results.filter(r => r.status === 'updated').length} services updated`,
    data: results,
  };
};

exports.getServicesByStore = async (query) => {
  const where = {};

  if (query.store_id) {
    where.store_id = query.store_id;
  }

  const settings = await StoreSetting.findAll({
    where,
    order: [['id', 'ASC']],
  });

  return { success: true, data: settings };
};

exports.addSetting = async (store_id, setting_key, setting_value) => {
  const existing = await StoreSetting.findOne({
    where: { store_id, setting_key },
  });

  if (existing) {
    return { success: false, message: 'Setting already exists' };
  }

  await StoreSetting.create({ store_id, setting_key, setting_value });
  return { success: true, message: 'Setting created' };
};

exports.updateSetting = async (store_id, setting_key, setting_value) => {
  const existing = await StoreSetting.findOne({
    where: { store_id, setting_key },
  });

  if (!existing) {
    return { success: false, message: 'Setting not found' };
  }

  await existing.update({ setting_value });
  return { success: true, message: 'Setting updated' };
};

exports.getSetting = async (store_id, setting_key) => {
  const setting = await StoreSetting.findOne({
    where: { store_id, setting_key },
  });
  return setting?.setting_value || null;
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