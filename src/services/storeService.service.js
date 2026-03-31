const StoreService = require('../models/storeService.model');
const Store = require('../models/store.model');
const { syncWebhooks } = require('../utils/shopifyWebhookHelper');

const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'https://notify.its.com.pk:5090/api/';

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

    const existing = await StoreService.findOne({
      where: { store_id, service_key },
    });

    if (existing) {
      await existing.update({ is_active });
      results.push({ service_key, status: 'updated' });
    } else {
      await StoreService.create({ store_id, service_key, is_active });
      results.push({ service_key, status: 'created' });
    }
  }

  const activeServices = await StoreService.findAll({
    where: { store_id, is_active: true },
  });
  const activeKeys = activeServices.map(s => s.service_key);
 
  const webhookResult = await syncWebhooks(store, activeKeys, WEBHOOK_BASE_URL);

  return {
    success: true,
    message: `${results.length} services updated`,
    data: results,
    webhooks: webhookResult,
  };

};

exports.getServicesByStore = async (query) => {
  const where = {};

  if (query.store_id) {
    where.store_id = query.store_id;
  }

  const services = await StoreService.findAll({
    where,
    order: [['id', 'ASC']],
  });

  return { success: true, data: services };
};
exports.isServiceActive = async (store_id, service_key) => {
  const service = await StoreService.findOne({
    where: { store_id, service_key, is_active: true },
  });

  return !!service;
};

exports.getActiveServices = async (store_id) => {
  const services = await StoreService.findAll({
    where: { store_id, is_active: true },
  });

  const activeKeys = services.map(s => s.service_key);

  return {
    isActive: (key) => activeKeys.includes(key),
    activeKeys,
  };
};