const AbandonedCartTemplate = require('../models/abandonedCartTemplate.model');
const AbandonedCartStoreConfig = require('../models/abandonedCartStoreConfig.model');
const Store = require('../models/store.model');
const { getPagination, getPaginationResponse } = require('../utils/paginationHelper');

exports.createTemplate = async (payload) => {
  const { store_id, template_name } = payload;

  if (!store_id || !template_name) {
    return { success: false, message: 'store_id and template_name are required' };
  }

  const store = await Store.findByPk(store_id);
  if (!store) {
    return { success: false, message: 'Store not found' };
  }

  const template = await AbandonedCartTemplate.create({
    store_id,
    template_name,
    client_id: payload.client_id || null,
    template_message_id: payload.template_message_id || null,
    wt_api: payload.wt_api || null,
    header_format: payload.header_format || null,
    header_value: payload.header_value || null,
    header_sample_value: payload.header_sample_value || null,
    body_text: payload.body_text || null,
    body_text_parameters: payload.body_text_parameters || null,
    buttons: payload.buttons || null,
    upload_media_id: payload.upload_media_id || null,
  });

  return { success: true, message: 'Template created successfully', data: template };
};

exports.updateTemplate = async (id, payload) => {
  const template = await AbandonedCartTemplate.findByPk(id);
  if (!template) {
    return { success: false, message: 'Template not found' };
  }

  await template.update(payload);
  return { success: true, message: 'Template updated successfully', data: template };
};

exports.deleteTemplate = async (id) => {
  const template = await AbandonedCartTemplate.findByPk(id);
  if (!template) {
    return { success: false, message: 'Template not found' };
  }

  const configs = await AbandonedCartStoreConfig.findAll();
  for (const config of configs) {
    const inUse = config.reminders.some(r => r.template_id === parseInt(id));
    if (inUse) {
      return { success: false, message: `Template is assigned to a reminder in store config (store_id: ${config.store_id}). Remove it from config first.` };
    }
  }

  await template.destroy();
  return { success: true, message: 'Template deleted successfully' };
};

exports.getTemplate = async (id) => {
  const template = await AbandonedCartTemplate.findByPk(id, {
    include: [{ model: Store, attributes: ['id', 'store_name', 'store_url'] }],
  });
  if (!template) {
    return { success: false, message: 'Template not found' };
  }
  return { success: true, data: template };
};

exports.getAllTemplates = async (query) => {
  const where = {};
  if (query.store_id) where.store_id = query.store_id;

  const { page: pageNum, limit: pageSize, offset } = getPagination(query);

  const { count, rows } = await AbandonedCartTemplate.findAndCountAll({
    where,
    include: [{ model: Store, attributes: ['id', 'store_name', 'store_url'] }],
    order: [['id', 'DESC']],
    limit: pageSize,
    offset,
  });

  return {
    success: true,
    data: rows,
    pagination: getPaginationResponse(count, pageNum, pageSize),
  };
};