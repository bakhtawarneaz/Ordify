const StoreSetting = require('../models/storeSetting.model');
const Store = require('../models/store.model');
const { getPagination, getPaginationResponse } = require('../utils/paginationHelper');

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

exports.bulkAddSettings = async (payload) => {
  const { store_id, settings } = payload;

  if (!store_id || !settings || !Array.isArray(settings) || settings.length === 0) {
    return { success: false, message: 'store_id and settings array are required' };
  }

  const store = await Store.findOne({ where: { id: store_id } });
  if (!store) return { success: false, message: 'Store not found' };

  const existingSettings = await StoreSetting.findAll({
    where: { store_id },
    attributes: ['setting_key'],
  });
  const existingKeys = new Set(existingSettings.map(s => s.setting_key));

  const toCreate = [];
  const results = [];

  for (const item of settings) {
    if (existingKeys.has(item.setting_key)) {
      results.push({ setting_key: item.setting_key, status: 'already_exists' });
    } else {
      toCreate.push({
        store_id,
        setting_key: item.setting_key,
        is_active: item.is_active !== undefined ? item.is_active : false,
      });
      results.push({ setting_key: item.setting_key, status: 'created' });
    }
  }

  if (toCreate.length > 0) {
    await StoreSetting.bulkCreate(toCreate);
  }

  return {
    success: true,
    message: `${toCreate.length} settings added, ${results.length - toCreate.length} already existed`,
    data: results,
  };
};

exports.bulkUpdateSettings = async (payload) => {
  const { store_id, settings } = payload;

  if (!store_id || !settings || !Array.isArray(settings) || settings.length === 0) {
    return { success: false, message: 'store_id and settings array are required' };
  }

  const store = await Store.findOne({ where: { id: store_id } });
  if (!store) {
    return { success: false, message: 'Store not found' };
  }

  const existingSettings = await StoreSetting.findAll({
    where: { store_id },
  });

  const existingMap = new Map();
  existingSettings.forEach(item => {
    existingMap.set(item.setting_key, item);
  });

  const results = await Promise.all(
    settings.map(async (item) => {
      const existing = existingMap.get(item.setting_key);

      if (!existing) {
        return {
          setting_key: item.setting_key,
          status: 'not_found',
        };
      }

      await existing.update({
        is_active: item.is_active,
      });

      return {
        setting_key: item.setting_key,
        status: 'updated',
      };
    })
  );

  return {
    success: true,
    message: 'Bulk update completed',
    data: results,
  };
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

exports.getByStore = async (query) => {
  const where = {};
  if (query.store_id) {
    where.store_id = query.store_id;
  }

  const { page: pageNum, limit: pageSize, offset } = getPagination(query);
  const storeWhere = query.store_id ? { id: query.store_id } : {};
  const { count, rows: stores } = await Store.findAndCountAll({
    where: storeWhere,
    attributes: ['id', 'store_name', 'store_url'],
    include: [
      {
        model: StoreSetting,
        attributes: ['id', 'setting_key', 'is_active', 'createdAt', 'updatedAt'],
        required: false,
      },
    ],
    order: [['id', 'ASC']],
    limit: pageSize,
    offset,
    distinct: true, 
  });

  const data = stores.map(store => ({
    store: {
      id: store.id,
      store_name: store.store_name,
      store_url: store.store_url,
    },
    settings: store.StoreSettings || [],
  }));

  return {
    success: true,
    data,
    pagination: getPaginationResponse(count, pageNum, pageSize),
  };
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