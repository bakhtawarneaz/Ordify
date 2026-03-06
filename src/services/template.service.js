const Template = require('../models/template.model');

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

  if (query.template_type) {
    where.template_type = query.template_type;
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
