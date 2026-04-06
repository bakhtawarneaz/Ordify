const StoreSetting = require('../models/storeSetting.model');
const Store = require('../models/store.model');

// Add (unified — toggle + setting dono)
exports.addSetting = async (payload) => {
  const { store_id, setting_key, setting_value, is_active } = payload;

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
    setting_value: setting_value || null,
    is_active: is_active !== undefined ? is_active : null,
  });

  return { success: true, message: 'Setting created', data: created };
};

// Update (unified — toggle + setting dono)
exports.updateSetting = async (payload) => {
  const { store_id, setting_key, setting_value, is_active } = payload;

  if (!store_id || !setting_key) {
    return { success: false, message: 'store_id and setting_key are required' };
  }

  const existing = await StoreSetting.findOne({
    where: { store_id, setting_key },
  });

  if (!existing) {
    return { success: false, message: 'Setting not found' };
  }

  const updateData = {};
  if (setting_value !== undefined) updateData.setting_value = setting_value;
  if (is_active !== undefined) updateData.is_active = is_active;

  await existing.update(updateData);
  return { success: true, message: 'Setting updated', data: existing };
};

// Delete
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

// Get single setting value
exports.getSetting = async (store_id, setting_key) => {
  const setting = await StoreSetting.findOne({
    where: { store_id, setting_key },
  });
  return setting?.setting_value || null;
};

// Get all by store
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

// Helper — check service active
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

// Helper — single service check
exports.isServiceActive = async (store_id, service_key) => {
  const service = await StoreSetting.findOne({
    where: { store_id, setting_key: service_key, is_active: true },
  });
  return !!service;
};