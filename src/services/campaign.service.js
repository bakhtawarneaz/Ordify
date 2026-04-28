const { Op, fn, col } = require('sequelize');
const Campaign = require('../models/campaign.model');
const CampaignOrder = require('../models/campaignOrder.model');
const Store = require('../models/store.model');
const { generateCampaignCode, buildTrackingUrl, generatePublicToken, extractCampaignCode } = require('../utils/campaignHelper');
const { getPagination, getPaginationResponse } = require('../utils/paginationHelper');

exports.createCampaign = async (payload) => {
  const { store_id, campaign_name, target_url, start_date, end_date, attribution_window_days, notes } = payload;

  if (!store_id || !campaign_name || !target_url || !start_date) {
    return { success: false, message: 'Missing required fields: store_id, campaign_name, target_url, or start_date' };
  }

  const store = await Store.findByPk(store_id);
  if (!store) {
    return { success: false, message: 'Store not found' };
  }

  let campaign_code;
  let attempts = 0;
  while (attempts < 5) {
    campaign_code = generateCampaignCode(campaign_name);
    const exists = await Campaign.findOne({ where: { campaign_code } });
    if (!exists) break;
    attempts++;
  }

  if (attempts >= 5) {
    return { success: false, message: 'Failed to generate unique campaign code' };
  }

  const tracking_url = buildTrackingUrl(target_url, campaign_code);
  const public_token = generatePublicToken();

  const campaign = await Campaign.create({
    store_id,
    campaign_name,
    campaign_code,
    target_url,
    tracking_url,
    start_date,
    end_date: end_date || null,
    attribution_window_days: attribution_window_days || 7,
    status: payload.status || 'active',
    public_token,
    notes: notes || null,
  });

  return { success: true, message: 'Campaign created successfully', data: campaign };
};

exports.updateCampaign = async (id, payload) => {
  const campaign = await Campaign.findByPk(id);
  if (!campaign) {
    return { success: false, message: 'Campaign not found' };
  }

  const { campaign_code, tracking_url, public_token, ...safePayload } = payload;
  await campaign.update(safePayload);

  return { success: true, message: 'Campaign updated successfully', data: campaign };
};

exports.deleteCampaign = async (id) => {
  const campaign = await Campaign.findByPk(id);
  if (!campaign) {
    return { success: false, message: 'Campaign not found' };
  }

  const attributedCount = await CampaignOrder.count({ where: { campaign_id: id } });

  if (attributedCount > 0) {
    return { success: false, message: `Cannot delete — ${attributedCount} attributed order(s) linked. Change status to cancelled instead.` };
  }

  await campaign.destroy();
  return { success: true, message: 'Campaign deleted successfully' };
};

exports.toggleCampaignStatus = async ({ campaign_id, status }) => {
  if (!campaign_id || !status) {
    return { success: false, message: 'campaign_id and status are required' };
  }

  if (!['active', 'inactive'].includes(status)) {
    return { success: false, message: 'Status must be active or inactive' };
  }

  const campaign = await Campaign.findByPk(campaign_id);
  if (!campaign) {
    return { success: false, message: 'Campaign not found' };
  }

  await campaign.update({ status });
  return {
    success: true,
    message: status === 'active' ? 'Campaign activated successfully' : 'Campaign deactivated successfully',
    data: campaign,
  };
};

exports.getCampaignById = async (id) => {
  const campaign = await Campaign.findByPk(id, {
    include: [{ model: Store, as: 'store', attributes: ['id', 'store_id', 'store_name', 'store_url'] }],
  });

  if (!campaign) {
    return { success: false, message: 'Campaign not found' };
  }

  return { success: true, data: campaign };
};

exports.getAllCampaigns = async (query) => {
  const where = {};

  if (query.store_id) where.store_id = query.store_id;
  if (query.status) where.status = query.status;

  if (query.search) {
    where[Op.or] = [
      { campaign_name: { [Op.iLike]: `%${query.search}%` } },
      { campaign_code: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  const { page: pageNum, limit: pageSize, offset } = getPagination(query);

  const { count, rows } = await Campaign.findAndCountAll({
    where,
    include: [{ model: Store, as: 'store', attributes: ['id', 'store_id', 'store_name'] }],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset,
  });

  return {
    success: true,
    data: rows,
    pagination: getPaginationResponse(count, pageNum, pageSize),
  };
};

exports.regeneratePublicToken = async (id) => {
  const campaign = await Campaign.findByPk(id);
  if (!campaign) {
    return { success: false, message: 'Campaign not found' };
  }

  const newToken = generatePublicToken();
  await campaign.update({ public_token: newToken });

  return { success: true, message: 'Public token regenerated', data: { public_token: newToken } };
};

exports.getCampaignReport = async (id) => {
  
  const campaign = await Campaign.findByPk(id, {
    include: [{ model: Store, as: 'store', attributes: ['id', 'store_id', 'store_name', 'store_url'] }],
  });

  if (!campaign) {
    return { success: false, message: 'Campaign not found' };
  }

  const stats = await CampaignOrder.findOne({
    where: { campaign_id: id },
    attributes: [
      [fn('COUNT', col('id')), 'total_orders'],
      [fn('SUM', col('revenue')), 'total_revenue'],
      [fn('AVG', col('revenue')), 'avg_order_value'],
      [fn('COUNT', fn('DISTINCT', col('customer_phone'))), 'unique_customers'],
    ],
    raw: true,
  });

  const dailyBreakdown = await CampaignOrder.findAll({
    where: { campaign_id: id },
    attributes: [
      [fn('DATE', col('attributed_at')), 'date'],
      [fn('COUNT', col('id')), 'orders'],
      [fn('SUM', col('revenue')), 'revenue'],
    ],
    group: [fn('DATE', col('attributed_at'))],
    order: [[fn('DATE', col('attributed_at')), 'ASC']],
    raw: true,
  });

  return {
    success: true,
    data: {
      campaign: {
        id: campaign.id,
        campaign_name: campaign.campaign_name,
        campaign_code: campaign.campaign_code,
        tracking_url: campaign.tracking_url,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        status: campaign.status,
        attribution_window_days: campaign.attribution_window_days,
        store: campaign.store,
      },
      summary: {
        total_orders: parseInt(stats?.total_orders) || 0,
        total_revenue: parseFloat(stats?.total_revenue || 0).toFixed(2),
        avg_order_value: parseFloat(stats?.avg_order_value || 0).toFixed(2),
        unique_customers: parseInt(stats?.unique_customers) || 0,
        currency: 'PKR',
      },
      daily_breakdown: dailyBreakdown,
    },
  };
};

exports.getStoreDashboard = async (store_id, query) => {
  const store = await Store.findByPk(store_id);
  if (!store) {
    return { success: false, message: 'Store not found' };
  }

  const orderWhere = { store_id: store_id };
  if (query.from && query.to) {
    orderWhere.attributed_at = { [Op.between]: [new Date(query.from), new Date(query.to)] };
  }

  const overallStats = await CampaignOrder.findOne({
    where: orderWhere,
    attributes: [
      [fn('COUNT', col('id')), 'total_orders'],
      [fn('SUM', col('revenue')), 'total_revenue'],
      [fn('COUNT', fn('DISTINCT', col('campaign_id'))), 'total_campaigns_used'],
      [fn('COUNT', fn('DISTINCT', col('customer_phone'))), 'unique_customers'],
    ],
    raw: true,
  });

  const dateFilter = query.from && query.to
    ? { attributed_at: { [Op.between]: [new Date(query.from), new Date(query.to)] } }
    : undefined;

  const campaigns = await Campaign.findAll({
    where: { store_id: store_id },
    attributes: [
      'id', 'campaign_name', 'campaign_code', 'start_date', 'end_date', 'status', 'tracking_url',
      [fn('COUNT', col('campaignOrders.id')), 'orders_count'],
      [fn('COALESCE', fn('SUM', col('campaignOrders.revenue')), 0), 'total_revenue'],
    ],
    include: [{
      model: CampaignOrder,
      as: 'campaignOrders',
      attributes: [],
      where: dateFilter,
      required: false,
    }],
    group: ['Campaign.id'],
    order: [['createdAt', 'DESC']],
    subQuery: false,
  });

  return {
    success: true,
    data: {
      store: {
        id: store.id,
        store_id: store.store_id,
        store_name: store.store_name,
        store_url: store.store_url,
      },
      summary: {
        total_orders: parseInt(overallStats?.total_orders) || 0,
        total_revenue: parseFloat(overallStats?.total_revenue || 0).toFixed(2),
        total_campaigns_used: parseInt(overallStats?.total_campaigns_used) || 0,
        unique_customers: parseInt(overallStats?.unique_customers) || 0,
      },
      campaigns: campaigns.map(c => ({
        id: c.id,
        campaign_name: c.campaign_name,
        campaign_code: c.campaign_code,
        start_date: c.start_date,
        end_date: c.end_date,
        status: c.status,
        tracking_url: c.tracking_url,
        orders_count: parseInt(c.get('orders_count')) || 0,
        total_revenue: parseFloat(c.get('total_revenue') || 0).toFixed(2),
      })),
    },
  };
};

exports.getPublicCampaignReport = async (code, token) => {
  if (!code || !token) {
    return { success: false, message: 'Campaign code and token are required' };
  }

  const campaign = await Campaign.findOne({
    where: { campaign_code: code, public_token: token },
    include: [{ model: Store, as: 'store', attributes: ['store_name'] }],
  });

  if (!campaign) {
    return { success: false, message: 'Invalid link or campaign not found' };
  }

  const stats = await CampaignOrder.findOne({
    where: { campaign_id: campaign.id },
    attributes: [
      [fn('COUNT', col('id')), 'total_orders'],
      [fn('SUM', col('revenue')), 'total_revenue'],
      [fn('AVG', col('revenue')), 'avg_order_value'],
    ],
    raw: true,
  });

  const dailyBreakdown = await CampaignOrder.findAll({
    where: { campaign_id: campaign.id },
    attributes: [
      [fn('DATE', col('attributed_at')), 'date'],
      [fn('COUNT', col('id')), 'orders'],
      [fn('SUM', col('revenue')), 'revenue'],
    ],
    group: [fn('DATE', col('attributed_at'))],
    order: [[fn('DATE', col('attributed_at')), 'ASC']],
    raw: true,
  });

  return {
    success: true,
    data: {
      campaign_name: campaign.campaign_name,
      store_name: campaign.store?.store_name,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      status: campaign.status,
      summary: {
        total_orders: parseInt(stats?.total_orders) || 0,
        total_revenue: parseFloat(stats?.total_revenue || 0).toFixed(2),
        avg_order_value: parseFloat(stats?.avg_order_value || 0).toFixed(2),
        currency: 'PKR',
      },
      daily_breakdown: dailyBreakdown,
    },
  };
};

exports.attributeOrderToCampaign = async (order, store) => {
  try {
    const landingSite = order.landing_site || '';
    const campaignCode = extractCampaignCode(landingSite);

    if (!campaignCode) {
      return { attributed: false, reason: 'No UTM campaign found' };
    }

    const campaign = await Campaign.findOne({
      where: { campaign_code: campaignCode, store_id: store.id, status: 'active' },
    });

    if (!campaign) {
      return { attributed: false, reason: `No active campaign found for code: ${campaignCode}` };
    }

    const orderDate = new Date(order.created_at);
    const campaignStart = new Date(campaign.start_date);
    const windowEnd = new Date(campaignStart);
    windowEnd.setDate(windowEnd.getDate() + (campaign.attribution_window_days || 7));

    if (orderDate < campaignStart) {
      return { attributed: false, reason: 'Order placed before campaign start date' };
    }

    if (orderDate > windowEnd) {
      return { attributed: false, reason: 'Order placed after attribution window' };
    }

    const customerName = `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim();
    const customerPhone = order.billing_address?.phone || order.customer?.phone || null;

    const [attribution, created] = await CampaignOrder.findOrCreate({
      where: { campaign_id: campaign.id, shopify_order_id: order.id },
      defaults: {
        campaign_id: campaign.id,
        store_id: store.id,
        shopify_order_id: order.id,
        order_number: order.name || order.order_number || null,
        customer_phone: customerPhone,
        customer_name: customerName || null,
        revenue: parseFloat(order.total_price) || 0,
        currency: order.currency || 'PKR',
        attribution_type: 'utm',
        attributed_at: new Date(),
        order_data: order,
      },
    });

    if (!created) {
      return { attributed: false, reason: 'Order already attributed to this campaign' };
    }

    return {
      attributed: true,
      campaign_id: campaign.id,
      campaign_name: campaign.campaign_name,
      revenue: attribution.revenue,
    };
  } catch (error) {
    console.error('Campaign attribution error:', error.message);
    return { attributed: false, reason: `Error: ${error.message}` };
  }
};