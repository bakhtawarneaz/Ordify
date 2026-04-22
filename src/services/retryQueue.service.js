const { Op } = require('sequelize');
const RetryQueue = require('../models/retryQueue.model');
const Store = require('../models/store.model');
const Order = require('../models/order.model');
const Template = require('../models/template.model');
const WhatsAppMessageResponse = require('../models/whatsappMessageResponse.model');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');
const { logSuccess, logFailed } = require('../utils/loggerHelper');
const { getPagination, getPaginationResponse } = require('../utils/paginationHelper');


exports.createRetryQueue = async ({ store_id, order_id, template_id, phone_number, status, error_message }) => {
  const log = await RetryQueue.create({
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


exports.getAllRetryQueue = async (query) => {
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

  const { page: pageNum, limit: pageSize, offset } = getPagination(query);

  const { count, rows } = await RetryQueue.findAndCountAll({
    where,
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

exports.retrySingle = async (logId) => {
  const log = await RetryQueue.findByPk(logId);

  if (!log) {
    return { success: false, message: 'Log not found' };
  }

  const store = await Store.findOne({ where: { id: log.store_id } });

  if (!store) {
    await logFailed({
      store_id: log.store_id,
      store_name: null,
      order_id: log.order_id,
      channel: 'whatsapp',
      action: 'retry',
      message: 'Store not found',
      details: { log_id: logId }
    });
    return { success: false, message: 'Store not found' };
  }

  const order = await Order.findOne({
    where: { order_id: log.order_id, store_id: log.store_id }
  });

  if (!order) {
    await logFailed({
      store_id: store.id,
      store_name: store.store_name,
      order_id: log.order_id,
      channel: 'whatsapp',
      action: 'retry',
      message: 'Order not found',
      details: { log_id: logId }
    });
    return { success: false, message: 'Order not found' };
  }

  const template = await Template.findByPk(log.template_id);

  if (!template) {
    await logFailed({
      store_id: store.id,
      store_name: store.store_name,
      order_id: log.order_id,
      channel: 'whatsapp',
      action: 'retry',
      message: 'Template not found',
      details: { log_id: logId }
    });
    return { success: false, message: 'Template not found' };
  }

  try {
    const sendResult = await sendWhatsAppMessage(
      order.order_data,
      template,
      store,
      log.phone_number
    );

    // ❌ Network / Token error
    if (!sendResult || sendResult.success === false) {
      const errorMsg = sendResult?.error || 'Failed to send';

      await log.update({
        status: 'failed',
        retry_count: log.retry_count + 1,
        error_message: errorMsg,
      });

      await logFailed({
        store_id: store.id,
        store_name: store.store_name,
        order_id: log.order_id,
        order_number: order.order_number,
        channel: 'whatsapp',
        action: 'retry_failed',
        message: `Retry failed for ${log.phone_number}`,
        details: { error: errorMsg, log_id: logId }
      });

      return { success: false, message: 'Retry failed', data: log };
    }

    const apiResponse = sendResult?.data?.data;
    const messageId = apiResponse?.result?.[0]?.messageId;

    // ❌ API error
    if (!messageId) {
      const errorMsg = apiResponse?.errorMessage || 'WhatsApp API error';

      await log.update({
        status: 'failed',
        retry_count: log.retry_count + 1,
        error_message: errorMsg,
      });

      await logFailed({
        store_id: store.id,
        store_name: store.store_name,
        order_id: log.order_id,
        order_number: order.order_number,
        channel: 'whatsapp',
        action: 'retry_failed',
        message: `API error for ${log.phone_number}`,
        details: { error: errorMsg, log_id: logId }
      });

      return { success: false, message: errorMsg, data: log };
    }

    // ✅ SUCCESS
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

    await logSuccess({
      store_id: store.id,
      store_name: store.store_name,
      order_id: log.order_id,
      order_number: order.order_number,
      channel: 'whatsapp',
      action: 'retry_success',
      message: `Retry successful for ${log.phone_number}`,
      details: { messageId, log_id: logId }
    });

    return { success: true, message: 'Retry successful', data: log };

  } catch (error) {
    await log.update({
      status: 'failed',
      retry_count: log.retry_count + 1,
      error_message: error.message,
    });

    await logFailed({
      store_id: store.id,
      store_name: store.store_name,
      order_id: log.order_id,
      order_number: order.order_number,
      channel: 'whatsapp',
      action: 'retry_error',
      message: `Unexpected error: ${error.message}`,
      details: { log_id: logId }
    });

    return { success: false, message: error.message };
  }
};

exports.retryBulk = async (body) => {
  try {
    let where = {
      status: 'failed',
    };

    if (body.log_ids && Array.isArray(body.log_ids) && body.log_ids.length > 0) {
      where.id = { [Op.in]: body.log_ids };
    }

    const failedLogs = await RetryQueue.findAll({ where });

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

    await logSuccess({
      store_id: retryableLogs[0]?.store_id || null,
      store_name: null,
      order_id: null,
      channel: 'whatsapp',
      action: 'bulk_retry',
      message: `Bulk retry done: ${successCount} success, ${failCount} failed`,
      details: {
        total: retryableLogs.length,
        success: successCount,
        failed: failCount
      }
    });

    return {
      success: true,
      message: `Bulk retry complete: ${successCount} sent, ${failCount} failed`,
      data: results,
    };

  } catch (error) {
    await logFailed({
      store_id: null,
      store_name: null,
      order_id: null,
      channel: 'whatsapp',
      action: 'bulk_retry_error',
      message: `Bulk retry failed: ${error.message}`,
      details: { error: error.message }
    });

    return {
      success: false,
      message: `Bulk retry failed: ${error.message}`
    };
  }
};