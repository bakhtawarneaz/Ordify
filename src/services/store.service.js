const Store = require('../models/store.model');
const { getPagination, getPaginationResponse } = require('../utils/paginationHelper');
const StoreSetting = require('../models/storeSetting.model');

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
    brand_name: payload.brand_name || null,
    campaign_id: payload.campaign_id || null,
    client_secret: payload.client_secret || null,
    feedback_delay_days: payload.feedback_delay_days || null,
    judge_me_api_token: payload.judge_me_api_token || null,
    reattempt_max_count: payload.reattempt_max_count || null,
    reattempt_delay_minutes: payload.reattempt_delay_minutes || null,
    whatsapp_trigger_tag: payload.whatsapp_trigger_tag || null,
    voice_reattempt_max_count: payload.voice_reattempt_max_count || null,
    voice_reattempt_delay_minutes: payload.voice_reattempt_delay_minutes || null
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

exports.getAllStores = async (query = {}) => {
  const where = {};

  if (query.status !== undefined) {
    where.status = query.status;
  }

  const { page: pageNum, limit: pageSize, offset } = getPagination(query);

  const { count, rows } = await Store.findAndCountAll({
    where,
    order: [['id', 'ASC']],
    limit: pageSize,
    offset,
    include: [
      {
        model: StoreSetting,
        attributes: ['id', 'setting_key', 'is_active'],
        required: false,
      },
    ],
    distinct: true,
  });

  return {
    success: true,
    data: rows,
    pagination: getPaginationResponse(count, pageNum, pageSize),
  };
};