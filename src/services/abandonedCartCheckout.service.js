const AbandonedCheckout = require('../models/abandonedCheckout.model');
const AbandonedCartTemplate = require('../models/abandonedCartTemplate.model');
const AbandonedCartStoreConfig = require('../models/abandonedCartStoreConfig.model');
const Store = require('../models/store.model');
const { sendAbandonedCartWhatsApp } = require('../utils/abandonedCartHelper');
const { getPagination, getPaginationResponse } = require('../utils/paginationHelper');

exports.getCheckouts = async (query) => {
  const { status, store_id } = query;
  const { page: pageNum, limit: pageSize, offset } = getPagination(query);

  const where = {};
  if (store_id) where.store_id = store_id;

  const totalCheckouts = await AbandonedCheckout.count({ where });
  const pendingCount = await AbandonedCheckout.count({ where: { ...where, status: 'pending' } });
  const recoveredCount = await AbandonedCheckout.count({ where: { ...where, status: 'recovered' } });
  const recoveryRate = totalCheckouts > 0 ? ((recoveredCount / totalCheckouts) * 100).toFixed(1) : '0.0';

  const listWhere = { ...where };
  if (status) listWhere.status = status;

  const { count, rows } = await AbandonedCheckout.findAndCountAll({
    where: listWhere,
    attributes: [
      'id', 'shopify_checkout_id', 'customer_name', 'customer_phone',
      'customer_email', 'cart_total', 'currency', 'status', 'source',
      'reminders_sent', 'last_reminder_at', 'recovered_at',
      'recovered_order_id', 'recovered_order_total', 'dt',
    ],
    include: [
      { model: Store, attributes: ['id', 'store_name'] },
    ],
    order: [['dt', 'DESC']],
    limit: pageSize,
    offset,
  });

  return {
    success: true,
    stats: {
      total: totalCheckouts,
      pending: pendingCount,
      recovered: recoveredCount,
      recovery_rate: recoveryRate,
    },
    data: rows,
    pagination: getPaginationResponse(count, pageNum, pageSize),
  };
};

exports.sendManualReminder = async (payload) => {
  const { abandoned_checkout_id, reminder_number, template_id } = payload;

  if (!abandoned_checkout_id) {
    return { success: false, message: 'abandoned_checkout_id is required' };
  }

  const checkout = await AbandonedCheckout.findByPk(abandoned_checkout_id);
  if (!checkout) {
    return { success: false, message: 'Checkout not found' };
  }

  if (checkout.status === 'recovered') {
    return { success: false, message: 'Checkout already recovered' };
  }

  if (checkout.status === 'expired') {
    return { success: false, message: 'Checkout has expired' };
  }

  const store = await Store.findByPk(checkout.store_id);
  if (!store) {
    return { success: false, message: 'Store not found' };
  }

  let template = null;
  if (template_id) {
    template = await AbandonedCartTemplate.findByPk(template_id);
  } else {
    const config = await AbandonedCartStoreConfig.findOne({ where: { store_id: store.id } });
    if (config) {
      const rConfig = config.reminders.find(r => r.reminder_number === (reminder_number || 1));
      if (rConfig?.template_id) {
        template = await AbandonedCartTemplate.findByPk(rConfig.template_id);
      }
    }
  }

  if (!template) {
    return { success: false, message: 'No template found. Provide template_id or configure reminder in store config.' };
  }

  const result = await sendAbandonedCartWhatsApp({
    checkout,
    template,
    store,
    reminderNumber: reminder_number || null,
    discountCode: null,
    reminderId: null,
  });

  if (!result.success) {
    return { success: false, message: `WhatsApp failed: ${result.error}` };
  }

  return { success: true, message: 'Manual reminder sent', data: { messageId: result.messageId } };
};