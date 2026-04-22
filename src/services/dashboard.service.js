const { Op, fn, col, literal } = require('sequelize');
const Order = require('../models/order.model');
const Store = require('../models/store.model');
const ActivityLog = require('../models/activityLog.model');
const RetryQueue = require('../models/retryQueue.model');


const getDateRange = (period) => {
  const now = new Date();
  let start;

  if (period === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    start = new Date(now);
    start.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    start = new Date(0);
  }

  return { [Op.between]: [start, now] };
};


const buildWhere = (query, extra = {}) => {
  const where = { ...extra };

  if (query.store_id) {
    where.store_id = query.store_id;
  }

  if (query.from && query.to) {
    where.createdAt = { [Op.between]: [new Date(query.from), new Date(query.to)] };
  }

  return where;
};

const getPreviousMonthRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 60);
  const end = new Date(now);
  end.setDate(now.getDate() - 30);
  return { [Op.between]: [start, end] };
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 30);
  return { [Op.between]: [start, now] };
};


exports.getOrderStats = async (query) => {
  const storeWhere = query.store_id ? { store_id: query.store_id } : {};

  if (query.from && query.to) {
    const total = await Order.count({
      where: { ...storeWhere, createdAt: { [Op.between]: [new Date(query.from), new Date(query.to)] } },
    });
    return { success: true, data: { today: 0, week: 0, month: 0, total } };
  }

  const today = await Order.count({ where: { ...storeWhere, createdAt: getDateRange('today') } });
  const week = await Order.count({ where: { ...storeWhere, createdAt: getDateRange('week') } });
  const month = await Order.count({ where: { ...storeWhere, createdAt: getDateRange('month') } });
  const total = await Order.count({ where: storeWhere });

  return {
    success: true,
    data: { today, week, month, total },
  };
};


exports.getMessageStats = async (query) => {
  const baseWhere = buildWhere(query);

  const channels = ['whatsapp', 'voice', 'ordify'];
  const stats = {};

  for (const channel of channels) {
    const channelWhere = { ...baseWhere, channel };

    const sent = await ActivityLog.count({
      where: { ...channelWhere, status: 'success', action: { [Op.like]: '%sent%' } },
    });

    const failed = await ActivityLog.count({
      where: { ...channelWhere, status: 'failed', action: { [Op.like]: '%sent%' } },
    });

    stats[channel] = { sent, failed, total: sent + failed };
  }

  return { success: true, data: stats };
};

exports.getMessageComparison = async (query) => {
  const storeWhere = query.store_id ? { store_id: query.store_id } : {};
  const channels = ['whatsapp', 'voice', 'ordify'];
  const comparison = {};

  for (const channel of channels) {
    const currentTotal = await ActivityLog.count({
      where: {
        ...storeWhere,
        channel,
        action: { [Op.like]: '%sent%' },
        createdAt: getCurrentMonthRange(),
      },
    });

    const previousTotal = await ActivityLog.count({
      where: {
        ...storeWhere,
        channel,
        action: { [Op.like]: '%sent%' },
        createdAt: getPreviousMonthRange(),
      },
    });

    let change, trend;
    if (previousTotal === 0) {
      change = currentTotal > 0 ? '+100%' : '0%';
      trend = currentTotal > 0 ? 'up' : 'neutral';
    } else {
      const percent = ((currentTotal - previousTotal) / previousTotal) * 100;
      const rounded = Math.round(percent);
      change = `${rounded >= 0 ? '+' : ''}${rounded}%`;
      trend = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'neutral';
    }

    comparison[channel] = {
      current: currentTotal,
      previous: previousTotal,
      change,
      trend,
    };
  }

  return { success: true, data: comparison };
};


exports.getTagStats = async (query) => {
  const where = buildWhere(query, { action: 'tag_added', status: 'success' });

  const tags = await ActivityLog.findAll({
    where,
    attributes: [
      [fn('COUNT', col('id')), 'count'],
      [literal("details->>'meaning'"), 'meaning'],
      'channel',
    ],
    group: [literal("details->>'meaning'"), 'channel'],
    raw: true,
  });

  return { success: true, data: tags };
};


exports.getStoreBreakdown = async () => {
  const stores = await Store.findAll({
    where: { status: true },
    attributes: ['id', 'store_id', 'store_name'],
    order: [['id', 'ASC']],
  });

  const breakdown = [];

  for (const store of stores) {
    const orders = await Order.count({ where: { store_id: store.id } });

    const whatsappSent = await ActivityLog.count({
      where: { store_id: store.id, channel: 'whatsapp', status: 'success', action: { [Op.like]: '%sent%' } },
    });

    const whatsappFailed = await ActivityLog.count({
      where: { store_id: store.id, channel: 'whatsapp', status: 'failed', action: { [Op.like]: '%sent%' } },
    });

    const voiceSent = await ActivityLog.count({
      where: { store_id: store.id, channel: 'voice', status: 'success', action: { [Op.like]: '%sent%' } },
    });

    const voiceFailed = await ActivityLog.count({
      where: { store_id: store.id, channel: 'voice', status: 'failed', action: { [Op.like]: '%sent%' } },
    });

    const ordifySent = await ActivityLog.count({
      where: { store_id: store.id, channel: 'ordify', status: 'success', action: { [Op.like]: '%sent%' } },
    });

    const ordifyFailed = await ActivityLog.count({
      where: { store_id: store.id, channel: 'ordify', status: 'failed', action: { [Op.like]: '%sent%' } },
    });

    const tagsAdded = await ActivityLog.count({
      where: { store_id: store.id, action: 'tag_added', status: 'success' },
    });

    breakdown.push({
      store_id: store.store_id,
      store_name: store.store_name,
      orders,
      whatsapp: { sent: whatsappSent, failed: whatsappFailed },
      voice: { sent: voiceSent, failed: voiceFailed },
      ordify: { sent: ordifySent, failed: ordifyFailed },
      tags_added: tagsAdded,
    });
  }

  return { success: true, data: breakdown };
};


exports.getRetryStats = async (query) => {
  const baseWhere = buildWhere(query);

  const failed = await RetryQueue.count({
    where: { ...baseWhere, status: 'failed' },
  });

  const pending = await RetryQueue.count({
    where: { ...baseWhere, status: 'failed', retry_count: { [Op.lt]: 3 } },
  });

  const sent = await RetryQueue.count({
    where: { ...baseWhere, status: 'sent' },
  });

  return {
    success: true,
    data: { failed, pending_retry: pending, sent },
  };
};


exports.getActiveStores = async () => {
  const active = await Store.count({ where: { status: true } });
  const inactive = await Store.count({ where: { status: false } });
  const total = active + inactive;

  return {
    success: true,
    data: { active, inactive, total },
  };
};


exports.getPaymentTypeStats = async (query) => {
  const storeWhere = query.store_id ? { store_id: query.store_id } : {};
  const dateWhere = query.from && query.to
    ? { createdAt: { [Op.between]: [new Date(query.from), new Date(query.to)] } }
    : {};

  const allOrders = await Order.findAll({
    where: { ...storeWhere, ...dateWhere },
    attributes: ['order_data'],
    raw: true,
  });

  let preOrders = 0;
  let postOrders = 0;

  for (const order of allOrders) {
    const orderData = typeof order.order_data === 'string' ? JSON.parse(order.order_data) : order.order_data;
    const isCOD = orderData?.payment_gateway_names?.includes('Cash on Delivery (COD)');
    if (isCOD) {
      postOrders++;
    } else {
      preOrders++;
    }
  }

  return {
    success: true,
    data: { pre_paid: preOrders, post_paid: postOrders, total: preOrders + postOrders },
  };
};

exports.getTemplateOverview = async (query) => {
  const baseWhere = buildWhere(query, {
    status: 'success',
    action: {
      [Op.in]: [
        'whatsapp_sent',
        'unanswered_whatsapp_sent',
        'order_dispatch_sent',
        'order_delivered_sent',
        'order_paid_sent',
        'order_tracking_sent',
        'split_order_sent',
      ],
    },
  });

  const templates = await ActivityLog.findAll({
    where: baseWhere,
    attributes: [
      [fn('COUNT', col('id')), 'count'],
      'channel',
      'action',
    ],
    group: ['channel', 'action'],
    order: [[fn('COUNT', col('id')), 'DESC']],
    raw: true,
  });

  return { success: true, data: templates };
};

exports.getDashboard = async (query) => {
  const orderStats = await exports.getOrderStats(query);
  const messageStats = await exports.getMessageStats(query);
  const messageComparison = await exports.getMessageComparison(query);
  const tagStats = await exports.getTagStats(query);
  const retryStats = await exports.getRetryStats(query);
  const activeStores = await exports.getActiveStores();
  const paymentTypeStats = await exports.getPaymentTypeStats(query);
  const templateOverview = await exports.getTemplateOverview(query);

  return {
    success: true,
    data: {
      orders: orderStats.data,
      payment_types: paymentTypeStats.data,
      messages: messageStats.data,
      message_comparison: messageComparison.data,
      tags: tagStats.data,
      retry: retryStats.data,
      stores: activeStores.data,
      templates: templateOverview.data,
    },
  };
};