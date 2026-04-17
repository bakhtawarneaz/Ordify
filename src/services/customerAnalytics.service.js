const { Op } = require('sequelize');
const sequelize = require('../config/db');
const Order = require('../models/order.model');
const Store = require('../models/store.model');
const Tag = require('../models/tag.model');
const { getPagination, getPaginationResponse } = require('../utils/paginationHelper');

const getOrderStatus = (orderTags, storeTags, createdAt) => {
  const tagList = (orderTags || '').toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
  for (const storeTag of storeTags) {
    if (tagList.includes(storeTag.name.toLowerCase().trim())) {
      if (storeTag.meaning === 'confirm') return 'confirmed';
      if (storeTag.meaning === 'cancel') return 'cancelled';
    }
  }
  const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return hours >= 24 ? 'expired' : 'pending';
};

const findOrdersByPhone = async (phone, storeId = null) => {
  const cleaned = phone.replace(/[^0-9]/g, '');
  const variations = [cleaned];
  if (cleaned.startsWith('0')) {
    variations.push('92' + cleaned.slice(1));
    variations.push('+92' + cleaned.slice(1));
  } else if (cleaned.startsWith('92')) {
    variations.push('0' + cleaned.slice(2));
    variations.push('+' + cleaned);
  }

  const searchConditions = variations.map(v => [
    `"order_data"->'billing_address'->>'phone' ILIKE '%${v}%'`,
    `"order_data"->'shipping_address'->>'phone' ILIKE '%${v}%'`,
    `"order_data"->'customer'->>'phone' ILIKE '%${v}%'`,
  ]).flat();

  const where = {
    [Op.or]: searchConditions.map(condition => ({
      [Op.and]: [sequelize.literal(condition)],
    })),
  };

  if (storeId) where.store_id = storeId;

  const orders = await Order.findAll({
    where,
    include: [{ model: Store, attributes: ['id', 'store_id', 'store_name', 'store_url'] }],
    order: [['id', 'DESC']],
  });

  return orders;
};

const getTimeAgo = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  return `${months} month${months > 1 ? 's' : ''} ago`;
};

exports.getCustomerDetail = async (query) => {
  const { phone } = query;

  if (!phone) {
    return { success: false, message: 'Phone number is required' };
  }

  const orders = await findOrdersByPhone(phone);

  if (orders.length === 0) {
    return { success: false, message: 'No customer found with this phone number' };
  }

  const latestOrder = orders[0].order_data;
  const firstOrder = orders[orders.length - 1].order_data;
  const customerName = `${latestOrder.billing_address?.first_name || ''} ${latestOrder.billing_address?.last_name || ''}`.trim() || 'N/A';
  const customerEmail = latestOrder.email || latestOrder.customer?.email || 'N/A';
  const customerPhone = latestOrder.billing_address?.phone || latestOrder.shipping_address?.phone || latestOrder.customer?.phone || 'N/A';

  const storeTags = await Tag.findAll();

  let confirmedCount = 0;
  let cancelledCount = 0;
  let totalSpent = 0;
  const storeMap = {};

  for (const order of orders) {
    const data = order.order_data;
    const status = getOrderStatus(data.tags, storeTags, data.created_at);
    if (status === 'confirmed') confirmedCount++;
    if (status === 'cancelled') cancelledCount++;
    totalSpent += parseFloat(data.total_price || 0);

    const storeName = order.Store?.store_name || 'Unknown';
    const storeDbId = order.store_id;
    if (!storeMap[storeDbId]) {
      storeMap[storeDbId] = { store_name: storeName, orders: 0, revenue: 0 };
    }
    storeMap[storeDbId].orders++;
    storeMap[storeDbId].revenue += parseFloat(data.total_price || 0);
  }

  const shopPerformance = Object.entries(storeMap).map(([storeId, data]) => ({
    store_id: parseInt(storeId),
    store_name: data.store_name,
    orders: data.orders,
    revenue: parseFloat(data.revenue).toFixed(2),
  }));

  const recentTimeline = orders.slice(0, 5).map(order => {
    const data = order.order_data;
    const status = getOrderStatus(data.tags, storeTags, data.created_at);
    return {
      order_number: order.order_number,
      store_name: order.Store?.store_name || 'Unknown',
      items_count: (data.line_items || []).length,
      total: data.total_price,
      status,
      time_ago: getTimeAgo(data.created_at),
    };
  });

  return {
    success: true,
    data: {
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: latestOrder.shipping_address?.address1 || latestOrder.billing_address?.address1 || 'N/A',
        city: latestOrder.shipping_address?.city || latestOrder.billing_address?.city || 'N/A',
        last_order_date: latestOrder.created_at,
        confirmed: confirmedCount,
        cancelled: cancelledCount,
      },
      stats: {
        total_orders: orders.length,
        total_spent: parseFloat(totalSpent).toFixed(2),
        total_stores: Object.keys(storeMap).length,
      },
      shop_performance: shopPerformance,
      recent_timeline: recentTimeline,
    },
  };
};

exports.getStoreDetail = async (query) => {
  const { phone, store_id } = query;
  const { page: pageNum, limit: pageSize, offset } = getPagination(query);

  if (!phone) {
    return { success: false, message: 'Phone number is required' };
  }

  if (!store_id) {
    return { success: false, message: 'store_id is required' };
  }

  const orders = await findOrdersByPhone(phone, store_id);

  if (orders.length === 0) {
    return { success: false, message: 'No orders found for this customer in this store' };
  }

  const latestOrder = orders[0].order_data;
  const customerName = `${latestOrder.billing_address?.first_name || ''} ${latestOrder.billing_address?.last_name || ''}`.trim() || 'N/A';
  const customerEmail = latestOrder.email || latestOrder.customer?.email || 'N/A';
  const customerPhone = latestOrder.billing_address?.phone || latestOrder.shipping_address?.phone || latestOrder.customer?.phone || 'N/A';
  const storeName = orders[0].Store?.store_name || 'Unknown';

  const storeTags = await Tag.findAll({ where: { store_id } });

  let totalSpent = 0;

  const allOrders = orders.map((order, index) => {
    const data = order.order_data;
    const status = getOrderStatus(data.tags, storeTags, data.created_at);
    const orderTotal = parseFloat(data.total_price || 0);
    totalSpent += orderTotal;

    const isCOD = data.payment_gateway_names?.includes('Cash on Delivery (COD)');
    const items = (data.line_items || []).map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    return {
      serial: index + 1,
      order_id: order.order_id,
      order_number: order.order_number,
      date: data.created_at,
      store_name: storeName,
      items,
      total: data.total_price,
      status,
      payment_method: isCOD ? 'Cash on Delivery' : data.payment_gateway_names?.[0] || 'N/A',
    };
  });

  const paginatedOrders = allOrders.slice(offset, offset + pageSize);

  return {
    success: true,
    data: {
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: latestOrder.shipping_address?.address1 || latestOrder.billing_address?.address1 || 'N/A',
        city: latestOrder.shipping_address?.city || latestOrder.billing_address?.city || 'N/A',
        customer_since: orders[orders.length - 1].order_data.created_at,
        total_orders: orders.length,
        total_spent: parseFloat(totalSpent).toFixed(2),
      },
      store_name: storeName,
      order_history: paginatedOrders,
      pagination: getPaginationResponse(allOrders.length, pageNum, pageSize),
    },
  };
};