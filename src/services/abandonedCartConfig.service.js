const AbandonedCartStoreConfig = require('../models/abandonedCartStoreConfig.model');
const AbandonedCartTemplate = require('../models/abandonedCartTemplate.model');
const Store = require('../models/store.model');
const { logSuccess } = require('../utils/loggerHelper');
const { getPagination, getPaginationResponse } = require('../utils/paginationHelper');

const DEFAULT_REMINDERS = [
  { reminder_number: 1, enabled: false, delay_minutes: 30, template_id: null, discount_code: null, product_image: 'first_in_cart' },
  { reminder_number: 2, enabled: false, delay_minutes: 180, template_id: null, discount_code: null, product_image: 'first_in_cart' },
  { reminder_number: 3, enabled: false, delay_minutes: 1440, template_id: null, discount_code: null, product_image: 'first_in_cart' },
];

exports.getConfigs = async (query) => {
  const { store_id } = query;
  const { page: pageNum, limit: pageSize, offset } = getPagination(query);

  const where = {};
  if (store_id) where.store_id = store_id;

  const { count, rows } = await AbandonedCartStoreConfig.findAndCountAll({
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

exports.saveConfig = async (payload) => {
  const { store_id, is_enabled, expiry_days, reminders } = payload;

  if (!store_id) {
    return { success: false, message: 'store_id is required' };
  }

  const store = await Store.findByPk(store_id);
  if (!store) {
    return { success: false, message: 'Store not found' };
  }

  if (reminders) {
    for (const reminder of reminders) {
      if (reminder.enabled && !reminder.template_id) {
        return { success: false, message: `Reminder #${reminder.reminder_number}: template is required when enabled` };
      }
      if (reminder.template_id) {
        const template = await AbandonedCartTemplate.findByPk(reminder.template_id);
        if (!template) {
          return { success: false, message: `Reminder #${reminder.reminder_number}: template_id ${reminder.template_id} not found` };
        }
        if (template.store_id !== parseInt(store_id)) {
          return { success: false, message: `Reminder #${reminder.reminder_number}: template belongs to different store` };
        }
      }
      if (reminder.delay_minutes && reminder.delay_minutes < 1) {
        return { success: false, message: `Reminder #${reminder.reminder_number}: delay must be at least 1 minute` };
      }
    }
  }

  let config = await AbandonedCartStoreConfig.findOne({ where: { store_id } });

  if (config) {
    await config.update({
      is_enabled: is_enabled !== undefined ? is_enabled : config.is_enabled,
      expiry_days: expiry_days || config.expiry_days,
      reminders: reminders || config.reminders,
    });
  } else {
    config = await AbandonedCartStoreConfig.create({
      store_id,
      is_enabled: is_enabled || false,
      expiry_days: expiry_days || 30,
      reminders: reminders || DEFAULT_REMINDERS,
    });
  }

  await logSuccess({
    store_id: store.id, store_name: store.store_name,
    order_id: null, order_number: null,
    channel: 'system', action: 'abandoned_cart_config_saved',
    message: `Abandoned cart config ${is_enabled ? 'enabled' : 'disabled'} for store`,
  });

  return { success: true, message: 'Config saved successfully', data: config };
};