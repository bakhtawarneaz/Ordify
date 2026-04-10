const FulfilledOrder = require('../models/fulfilledOrder.model');
const Store = require('../models/store.model');
const { feedbackQueue } = require('../config/queue');
const { extractPhoneFromOrder } = require('../utils/phoneHelper');
const { logSuccess, logFailed } = require('../utils/loggerHelper');
const axios = require('axios');

exports.handleFeedbackOnFulfilled = async (store, orderData) => {
  try {
    const existingRecord = await FulfilledOrder.findOne({
      where: { store_id: store.id, order_id: orderData.id.toString() },
    });

    if (existingRecord) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'whatsapp', action: 'feedback_skipped', message: 'Fulfilled order already exists' });
      return { success: true, message: 'Already exists' };
    }

    const customerName = `${orderData.billing_address?.first_name || ''} ${orderData.billing_address?.last_name || ''}`.trim();
    const customerPhone = extractPhoneFromOrder(orderData);
    const customerEmail = orderData.customer?.email || orderData.email || '';
    const lineItems = orderData.line_items || [];
    const productIds = lineItems.map(item => item.product_id).join(',');
    const productNames = lineItems.map(item => item.name).join(',');

    const delayDaysSetting = store.feedback_delay_days || 7;
    const delayDays = parseInt(delayDaysSetting) || 7;
    const delayMs = delayDays * 24 * 60 * 60 * 1000;
    const sendFeedbackAt = new Date(Date.now() + delayMs);

    const fulfilledOrder = await FulfilledOrder.create({
      store_id: store.id,
      order_id: orderData.id.toString(),
      order_number: orderData.name || orderData.order_number,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      product_ids: productIds,
      product_names: productNames,
      order_data: orderData,
      fulfilled_at: new Date(),
      send_feedback_at: sendFeedbackAt,
      feedback_sent: false,
      feedback_received: false,
    });

    await feedbackQueue.add('send-feedback', {
      fulfilledOrderId: fulfilledOrder.id,
    }, {
      delay: delayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });

    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'whatsapp', action: 'feedback_scheduled', message: `Feedback scheduled after ${delayDays} days`, details: { send_feedback_at: sendFeedbackAt } });

    return { success: true, message: `Feedback scheduled after ${delayDays} days` };
  } catch (error) {
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'feedback_scheduled', message: `Feedback scheduling failed: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};

exports.handleFeedbackResponse = async (callbackData) => {
  try {
    const { event, message_id, rating, rating_description, customer, timestamp } = callbackData;
    
    if (!message_id) {
      return { success: false, message: 'message_id is required' };
    }

    const fulfilledOrder = await FulfilledOrder.findOne({
      where: { message_id },
    });

    if (!fulfilledOrder) {
      return { success: false, message: 'Order not found for this message_id' };
    }

    const store = await Store.findByPk(fulfilledOrder.store_id);

    const judgeMeToken = store.judge_me_api_token || null;
    if (!store || !judgeMeToken) {
      await logFailed({ store_id: fulfilledOrder.store_id, store_name: null, order_id: fulfilledOrder.order_id, order_number: fulfilledOrder.order_number, channel: 'whatsapp', action: 'feedback_received', message: 'Judge.me credentials not configured' });
      return { success: false, message: 'Judge.me credentials not configured' };
    }

    const reviewData = {
      shop_domain: store.store_url,
      api_token: judgeMeToken,
      platform: 'shopify',
      id: fulfilledOrder.product_ids?.split(',')[0]?.trim(),
      email: fulfilledOrder.customer_email || `${fulfilledOrder.customer_phone}@review.placeholder.com`,
      name: fulfilledOrder.customer_name,
      rating: parseInt(rating) || 5,
      title: fulfilledOrder.customer_name || '',
      body: rating_description || 'Great product!',
    };

    const response = await axios.post('https://judge.me/api/v1/reviews', reviewData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.status >= 200 && response.status < 300) {
      await fulfilledOrder.update({
        feedback_received: true,
        rating: parseInt(rating) || 5,
        review_text: rating_description || '',
      });

      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: fulfilledOrder.order_id, order_number: fulfilledOrder.order_number, channel: 'whatsapp', action: 'feedback_received', message: `Review submitted - Rating: ${rating}`, details: { rating, review_text: rating_description } });

      return { success: true, message: 'Review submitted successfully' };
    }

    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: fulfilledOrder.order_id, order_number: fulfilledOrder.order_number, channel: 'whatsapp', action: 'feedback_received', message: `Judge.me API error`, details: { status: response.status, data: response.data } });

    return { success: false, message: 'Judge.me API error' };
  } catch (error) {
    await logFailed({ store_id: null, store_name: null, order_id: null, channel: 'whatsapp', action: 'feedback_received', message: `Feedback response error: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};