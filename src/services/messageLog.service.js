const { Op } = require('sequelize');
const MessageLog = require('../models/messageLog.model');
const Store = require('../models/store.model');
const Order = require('../models/order.model');
const Template = require('../models/template.model');
const WhatsAppMessageResponse = require('../models/whatsappMessageResponse.model');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');


exports.createLog = async ({ store_id, order_id, template_id, phone_number, status, error_message }) => {
  const log = await MessageLog.create({
    store_id,
    order_id,
    template_id: template_id || null,
    phone_number: phone_number || null,
    status,
    error_message: error_message || null,
    retry_count: 0,
    max_retries: 3,
  });
  return log;
};


exports.getAllLogs = async (query) => {
  const where = {};

  if (query.store_id) {
    where.store_id = query.store_id;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.order_id) {
    where.order_id = query.order_id;
  }

  if (query.from && query.to) {
    where.createdAt = {
      [Op.between]: [new Date(query.from), new Date(query.to)],
    };
  }

  const logs = await MessageLog.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });

  return { success: true, data: logs };
};


exports.retrySingle = async (logId) => {
  const log = await MessageLog.findByPk(logId);

  if (!log) {
    return { success: false, message: 'Log not found' };
  }

  if (log.status === 'sent') {
    return { success: false, message: 'Message already sent successfully' };
  }

  if (log.retry_count >= log.max_retries) {
    return { success: false, message: 'Max retries reached' };
  }

  const store = await Store.findOne({ where: { id: log.store_id } });
  if (!store) {
    return { success: false, message: 'Store not found' };
  }

  const order = await Order.findOne({ where: { order_id: log.order_id, store_id: log.store_id } });
  if (!order) {
    return { success: false, message: 'Order not found' };
  }

  const template = await Template.findByPk(log.template_id);
  if (!template) {
    return { success: false, message: 'Template not found' };
  }

  try {
    const sendResult = await sendWhatsAppMessage(order.order_data, template, store, log.phone_number);

    if (!sendResult || sendResult.success === false) {
      await log.update({
        status: 'failed',
        retry_count: log.retry_count + 1,
        error_message: sendResult?.error || 'Failed to send',
      });
      return { success: false, message: 'Retry failed', data: log };
    }

    // Check WhatsApp API response
    const apiResponse = sendResult?.data?.data;
    const messageId = apiResponse?.result?.[0]?.messageId;

    if (!messageId) {
      await log.update({
        status: 'failed',
        retry_count: log.retry_count + 1,
        error_message: apiResponse?.errorMessage || 'WhatsApp API error',
      });
      return { success: false, message: apiResponse?.errorMessage || 'Retry failed', data: log };
    }

   // Success
    await WhatsAppMessageResponse.create({
      store_id: store.id,
      order_id: log.order_id,
      phone_number: apiResponse.result[0].number,
      message_id: messageId,
    });

    await log.update({
      status: 'sent',
      retry_count: log.retry_count + 1,
      error_message: null,
    });

    return { success: true, message: 'Retry successful, message sent', data: log };
  } catch (error) {
    await log.update({
      status: 'failed',
      retry_count: log.retry_count + 1,
      error_message: error.message,
    });
    return { success: false, message: `Retry failed: ${error.message}` };
  }
};

exports.retryBulk = async (body, query) => {
  const where = {
    status: 'failed',
  };
 
  if (body.log_ids && Array.isArray(body.log_ids) && body.log_ids.length > 0) {
    where.id = { [Op.in]: body.log_ids };
  } else {
    if (query.store_id) {
      where.store_id = query.store_id;
    }
  }
 
  const failedLogs = await MessageLog.findAll({ where });
 
  const retryableLogs = failedLogs.filter(log => log.retry_count < log.max_retries);
 
  if (retryableLogs.length === 0) {
    return { success: true, message: 'No failed messages to retry', data: [] };
  }
 
  const results = [];
 
  for (const log of retryableLogs) {
    const result = await exports.retrySingle(log.id);
    results.push({ log_id: log.id, order_id: log.order_id, ...result });
  }
 
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
 
  return {
    success: true,
    message: `Bulk retry complete: ${successCount} sent, ${failCount} failed`,
    data: results,
  };
};