const { Op } = require('sequelize');
const AbandonedCartMessageLog = require('../models/abandonedCartMessageLog.model');
const AbandonedCheckout = require('../models/abandonedCheckout.model');
const AbandonedCartTemplate = require('../models/abandonedCartTemplate.model');
const { getPagination, getPaginationResponse } = require('../utils/paginationHelper');

exports.getMessageLogs = async (storeId, query) => {
  const { from, to } = query;
  const { page: pageNum, limit: pageSize, offset } = getPagination(query);

  const where = { store_id: storeId };
  if (from || to) {
    where.dt = {};
    if (from) where.dt[Op.gte] = new Date(from);
    if (to) where.dt[Op.lte] = new Date(to);
  }

  const { count, rows } = await AbandonedCartMessageLog.findAndCountAll({
    where,
    include: [
      { model: AbandonedCheckout, attributes: ['shopify_checkout_id', 'customer_name', 'cart_total', 'currency'] },
      { model: AbandonedCartTemplate, attributes: ['template_name'] },
    ],
    order: [['dt', 'DESC']],
    limit: pageSize,
    offset,
  });

  const formatted = rows.map(log => ({
    id: log.id,
    sent_at: log.dt,
    checkout_id: log.AbandonedCheckout?.shopify_checkout_id || null,
    customer_name: log.AbandonedCheckout?.customer_name || null,
    phone: log.customer_phone,
    reminder_number: log.reminder_number,
    template_name: log.AbandonedCartTemplate?.template_name || null,
    discount_code: log.discount_code,
    status: log.whatsapp_status,
    read: log.whatsapp_status === 'read',
    clicked: log.clicked,
    recovered: log.recovered,
    recovered_order_id: log.recovered_order_id,
    recovered_order_total: log.recovered_order_total,
    error_message: log.error_message,
  }));

  return {
    success: true,
    data: formatted,
    pagination: getPaginationResponse(count, pageNum, pageSize),
  };
};