const Store = require('../models/store.model');

exports.createStore = async (payload) => {
  const { store_id, store_name } = payload;

  if (!store_id || !store_name) {
    return { success: false, message: 'store_id and store_name are required' };
  }

  const exists = await Store.findOne({ where: { store_id } });
  if (exists) {
    return { success: false, message: 'Store with this store_id already exists' };
  }

  const store = await Store.create({
    store_id,
    store_url: payload.store_url || null,
    store_name,
    sender: payload.sender || null,
    access_token: payload.access_token || null,
    api_key: payload.api_key || null,
    status: payload.status !== undefined ? payload.status : true,
    whatsapp_only: payload.whatsapp_only || false,
    voice_only: payload.voice_only || false,
    ordify_only: payload.ordify_only || false,
    brand_name: payload.brand_name || null,
    post_paid: payload.post_paid || false,
    pre_paid: payload.pre_paid || false,
    campaign_id: payload.campaign_id || null,
    client_secret: payload.client_secret || null,
  });

  return { success: true, message: 'Store created successfully', data: store };
};

exports.updateStore = async (id, payload) => {
  const store = await Store.findByPk(id);
  if (!store) {
    return { success: false, message: 'Store not found' };
  }

  await store.update(payload);
  return { success: true, message: 'Store updated successfully', data: store };
};

exports.deleteStore = async (id) => {
  const store = await Store.findByPk(id);
  if (!store) {
    return { success: false, message: 'Store not found' };
  }

  await store.destroy();
  return { success: true, message: 'Store deleted successfully' };
};

exports.getStoreById = async (id) => {
  const store = await Store.findByPk(id);
  if (!store) {
    return { success: false, message: 'Store not found' };
  }

  return { success: true, data: store };
};

exports.getAllStores = async (query) => {
  const where = {};

  if (query.status !== undefined) {
    where.status = query.status;
  }

  if (query.whatsapp_only !== undefined) {
    where.whatsapp_only = query.whatsapp_only;
  }

  if (query.voice_only !== undefined) {
    where.voice_only = query.voice_only;
  }

  if (query.ordify_only !== undefined) {
    where.ordify_only = query.ordify_only;
  }

  const stores = await Store.findAll({
    where,
    order: [['id', 'ASC']],
  });

  return { success: true, data: stores };
};