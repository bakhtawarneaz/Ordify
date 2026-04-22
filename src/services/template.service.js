const Template = require('../models/template.model');
const Store = require('../models/store.model');
const { Op } = require('sequelize');
const { getPagination, getPaginationResponse } = require('../utils/paginationHelper');


exports.createTemplate = async (payload) => {
  const {
    store_id,
    client_id,
    action,
    template_message_id,
    header_value,
    header_sample_value,
    body_text,
    body_text_parameters,
    wt_api,
    header_format,
    upload_media_id,
    template_type,
    buttons,
    download_attachment,
    tracking_name,
    payment_type
  } = payload;

  if (!store_id || !template_type) {
    return { success: false, message: 'store_id and template_type are required' };
  }

  if (!['whatsapp', 'voice'].includes(template_type)) {
    return { success: false, message: 'template_type must be whatsapp or voice' };
  }

  const template = await Template.create({
    store_id,
    client_id: client_id || null,
    action: action || null,
    template_message_id: template_message_id || null,
    header_value: header_value || null,
    header_sample_value: header_sample_value || null,
    body_text: body_text || null,
    body_text_parameters: body_text_parameters || null,
    wt_api: wt_api || null,
    header_format: header_format || null,
    upload_media_id: upload_media_id || null,
    template_type,
    buttons: buttons || null,
    download_attachment: download_attachment || false,
    tracking_name: tracking_name || null,
    payment_type: payment_type || null
  });

  return { success: true, message: 'Template created successfully', data: template };
};

exports.updateTemplate = async (id, payload) => {
  const template = await Template.findByPk(id);
  if (!template) {
    return { success: false, message: 'Template not found' };
  }

  if (payload.template_type && !['whatsapp', 'voice'].includes(payload.template_type)) {
    return { success: false, message: 'template_type must be whatsapp or voice' };
  }

  await template.update(payload);
  return { success: true, message: 'Template updated successfully', data: template };
};

exports.deleteTemplate = async (id) => {
  const template = await Template.findByPk(id);
  if (!template) {
    return { success: false, message: 'Template not found' };
  }

  await template.destroy();
  return { success: true, message: 'Template deleted successfully' };
};

exports.getTemplateById = async (id) => {
  const template = await Template.findByPk(id);
  if (!template) {
    return { success: false, message: 'Template not found' };
  }

  return { success: true, data: template };
};

exports.getAllTemplates = async (query) => {
  const where = {};

  if (query.template_id) {
    where.template_message_id = query.template_id;
  }

  if (query.store_id) {
    where.store_id = query.store_id;
  }

  if (query.action) {
    where.action = query.action;
  }

  const templates = await Template.findAll({
    where,
    order: [['id', 'ASC']],
  });

  return { success: true, data: templates };
};

exports.fetchTemplates = async (query) => {
  const { store_id, template_id, action, template_type } = query;

  const where = {};

  if (store_id) where.store_id = store_id;
  if (template_id) where.template_message_id = template_id;
  if (action) where.action = { [Op.iLike]: `%${action}%` };
  if (template_type) where.template_type = template_type;

  const { page: pageNum, limit: pageSize, offset } = getPagination(query);

  const { count, rows } = await Template.findAndCountAll({
    where,
    include: [{ model: Store, attributes: ['id', 'store_name', 'store_url'] }],
    order: [['id', 'ASC']],
    limit: pageSize,
    offset,
  });

  const formatted = rows.map((t) => ({
    id: t.id,
    store_name: t.Store?.store_name || 'N/A',
    store_id: t.store_id,
    client_id: t.client_id,
    action: t.action || 'N/A',
    template_message_id: t.template_message_id,
    template_type: t.template_type,
    payment_type: t.payment_type,
    header_format: t.header_format,
    header_value: t.header_value,
    header_sample_value: t.header_sample_value,
    upload_media_id: t.upload_media_id,
    body_text: t.body_text,
    body_parameters: t.body_text_parameters,
    buttons: t.buttons,
    download_attachment: t.download_attachment,
    wt_api: t.wt_api,
    tracking_name: t.tracking_name,
    created_at: t.dt,
    updated_at: t.dtu,
  }));

  return {
    success: true,
    data: formatted,
    pagination: getPaginationResponse(count, pageNum, pageSize),
  };
};