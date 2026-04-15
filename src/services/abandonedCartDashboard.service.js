const { Op } = require('sequelize');
const AbandonedCartMessageLog = require('../models/abandonedCartMessageLog.model');
const AbandonedCheckout = require('../models/abandonedCheckout.model');

exports.getDashboard = async (storeId, query) => {
  const { from, to } = query;

  const dateFilter = {};
  if (from) dateFilter[Op.gte] = new Date(from);
  if (to) dateFilter[Op.lte] = new Date(to);

  const where = { store_id: storeId };
  if (from || to) where.dt = dateFilter;

  const messagesSent = await AbandonedCartMessageLog.count({
    where: { ...where, whatsapp_status: { [Op.ne]: 'failed' } },
  });

  const messagesRead = await AbandonedCartMessageLog.count({
    where: { ...where, whatsapp_status: 'read' },
  });

  const ordersRecovered = await AbandonedCartMessageLog.count({
    where: { ...where, recovered: true },
    col: 'abandoned_checkout_id',
    distinct: true,
  });

  const checkoutWhere = { store_id: storeId, status: 'recovered' };
  if (from || to) checkoutWhere.recovered_at = dateFilter;

  const recoveredTotal = await AbandonedCheckout.sum('recovered_order_total', {
    where: checkoutWhere,
  });

  return {
    success: true,
    data: {
      messages_sent: messagesSent || 0,
      messages_read: messagesRead || 0,
      orders_recovered: ordersRecovered || 0,
      amount_recovered: parseFloat(recoveredTotal || 0).toFixed(2),
    },
  };
};