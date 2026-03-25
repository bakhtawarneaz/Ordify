const { Op } = require('sequelize');
const ActivityLog = require('../models/activityLog.model');

exports.getAllLogs = async (query) => {
  const where = {};

  if (query.store_id) {
    where.store_id = query.store_id;
  }

  if (query.channel) {
    where.channel = query.channel;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.action) {
    where.action = query.action;
  }

  if (query.order_id) {
    where.order_id = query.order_id;
  }

  if (query.from && query.to) {
    where.createdAt = {
      [Op.between]: [new Date(query.from), new Date(query.to)],
    };
  }

  const logs = await ActivityLog.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });

  return { success: true, data: logs };
};

exports.getLogStats = async (store_id) => {
  const where = {};
  if (store_id) {
    where.store_id = store_id;
  }

  const totalLogs = await ActivityLog.count({ where });

  const successLogs = await ActivityLog.count({
    where: { ...where, status: 'success' },
  });

  const failedLogs = await ActivityLog.count({
    where: { ...where, status: 'failed' },
  });

  return {
    success: true,
    data: {
      total: totalLogs,
      success: successLogs,
      failed: failedLogs,
    },
  };
};