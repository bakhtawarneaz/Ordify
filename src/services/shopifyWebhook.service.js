const { Op } = require('sequelize');
const Store = require('../models/store.model');
const Order = require('../models/order.model');
const Template = require('../models/template.model');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');
const { createRetryQueue } = require('../services/retryQueue.service');
const { isServiceActive } = require('../services/storeService.service');
const { handleWhatsAppSend } = require('../services/whatsappCallback.service');
const { handleVoiceCall } = require('../services/voiceCallback.service');
const { handleOrdifySend } = require('../services/ordifyCallback.service');

// ========== UNIFIED SHOPIFY WEBHOOK ==========

exports.handleShopifyWebhook = async (orderData, topic) => {
  try {
    const match = orderData.order_status_url?.match(/\/\/([^\/]+)\//);
    const storeUrl = match ? match[1] : null;

    if (!storeUrl) {
      return { success: false, message: 'Could not identify store from order' };
    }

    const store = await Store.findOne({
      where: { store_url: { [Op.like]: `%${storeUrl}%` }, status: true }, 
    });

    if (!store) {
      return { success: false, message: 'Store not found or inactive' };
    }

    // 2. Route based on topic
    switch (topic) {
      case 'orders/create':
        return await handleOrderCreate(store, orderData);

      case 'orders/fulfilled':
        return await handleOrderFulfilled(store, orderData);

      case 'orders/paid':
        return await handleOrderPaid(store, orderData);

      case 'orders/updated':
        return await handleOrderUpdated(store, orderData);

      default:
        return { success: false, message: `Unknown webhook topic: ${topic}` };
    }
  } catch (error) {
    console.error('Error in handleShopifyWebhook:', error.message);
    return { success: false, message: error.message };
  }
};

// ========== ORDER CREATE ==========

const handleOrderCreate = async (store, orderData) => {
  try {
    const existingOrder = await Order.findOne({
      where: { store_id: store.id, order_id: orderData.id },
    });

    if (existingOrder) {
      return { success: false, message: 'Order already processed' };
    }

    await Order.create({
      store_id: store.id,
      order_id: orderData.id,
      order_number: orderData.name || orderData.order_number,
      order_data: orderData,
    });

    const results = [];

    if (store.whatsapp_only) {
      const whatsappResult = await handleWhatsAppSend(store, orderData);
      results.push({ service: 'whatsapp', ...whatsappResult });
    }

    if (store.voice_only) {
      const voiceResult = await handleVoiceCall(orderData, store);
      results.push({ service: 'voice', ...voiceResult });
    }

    if (store.ordify_only) {
      const ordifyResult = await handleOrdifySend(orderData, store);
      results.push({ service: 'ordify', ...ordifyResult });
    }

    if (results.length === 0) {
      return { success: true, message: 'Order saved, no services enabled' };
    }

    return { success: true, message: 'Order saved and services triggered', data: results };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// ========== ORDER FULFILLED (dispatch + split) ==========

const handleOrderFulfilled = async (store, orderData) => {
  try {
    const fulfillments = orderData.fulfillments || [];
    const latestFulfillment = fulfillments[fulfillments.length - 1];

    if (!latestFulfillment) {
      return { success: false, message: 'No fulfillment data found' };
    }

    const itemCount = latestFulfillment.line_items?.length || 0;
    const results = [];

    // Split order service
    const splitActive = await isServiceActive(store.id, 'order_split');
    if (splitActive && itemCount > 0) {
      const splitResult = await sendEventWhatsApp(store, orderData, 'split_order', itemCount);
      results.push({ service: 'order_split', ...splitResult });
    }

    // Dispatch service
    const dispatchActive = await isServiceActive(store.id, 'order_dispatch');
    if (dispatchActive) {
      const dispatchResult = await sendEventWhatsApp(store, orderData, 'order_dispatch');
      results.push({ service: 'order_dispatch', ...dispatchResult });
    }

    if (results.length === 0) {
      return { success: true, message: 'No fulfilled services active for this store' };
    }

    return { success: true, message: 'Fulfilled services triggered', data: results };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// ========== ORDER PAID ==========

const handleOrderPaid = async (store, orderData) => {
  try {
    const paidActive = await isServiceActive(store.id, 'order_paid');

    if (!paidActive) {
      return { success: true, message: 'Order paid service not active for this store' };
    }

    const result = await sendEventWhatsApp(store, orderData, 'order_paid');
    return { service: 'order_paid', ...result };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// ========== ORDER UPDATED (delivered + tracking) ==========

const handleOrderUpdated = async (store, orderData) => {
  try {
    const results = [];

    // Delivered service
    const deliveredActive = await isServiceActive(store.id, 'order_delivered');
    if (deliveredActive) {
      const fulfillments = orderData.fulfillments || [];
      const isDelivered = fulfillments.some(f => f.shipment_status === 'delivered');

      if (isDelivered) {
        const deliveredResult = await sendEventWhatsApp(store, orderData, 'order_delivered');
        results.push({ service: 'order_delivered', ...deliveredResult });
      }
    }

    // Tracking service
    const trackingActive = await isServiceActive(store.id, 'order_tracking');
    if (trackingActive) {
      const fulfillments = orderData.fulfillments || [];
      const hasTracking = fulfillments.some(f => f.tracking_number);

      if (hasTracking) {
        const trackingResult = await sendEventWhatsApp(store, orderData, 'order_tracking');
        results.push({ service: 'order_tracking', ...trackingResult });
      }
    }

    if (results.length === 0) {
      return { success: true, message: 'No updated services active or triggered' };
    }

    return { success: true, message: 'Updated services triggered', data: results };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// ========== HELPER: Send WhatsApp for any event ==========

const sendEventWhatsApp = async (store, orderData, action, itemCount = null) => {
  try {
    let template = null;

    // For split order — find specific template first, then fallback to generic
    if (action === 'split_order' && itemCount) {
      template = await Template.findOne({
        where: { store_id: store.id, template_type: 'whatsapp', action: `split_order_${itemCount}` },
      });

      if (!template) {
        template = await Template.findOne({
          where: { store_id: store.id, template_type: 'whatsapp', action: 'split_order' },
        });
      }
    } else {
      template = await Template.findOne({
        where: { store_id: store.id, template_type: 'whatsapp', action },
      });
    }

    if (!template) {
      return { success: false, message: `Template not found for action: ${action}` };
    }

    const rawPhone = orderData?.billing_address?.phone || orderData?.customer?.phone || '';
    const phoneNumber = rawPhone.startsWith('03') ? rawPhone.replace(/^03/, '923') : rawPhone.replace(/^\+/, '');

    const sendResult = await sendWhatsAppMessage(orderData, template, store);

    // Network/token error
    if (!sendResult || sendResult.success === false) {
      await createRetryQueue({ store_id: store.id, order_id: orderData.id, template_id: template.id, phone_number: phoneNumber, status: 'failed', error_message: sendResult?.error || 'Failed to send' });
      return { success: false, message: sendResult?.error || 'Failed to send' };
    }

    // API level error
    const apiResponse = sendResult?.data?.data;
    const messageId = apiResponse?.result?.[0]?.messageId;

    if (!messageId) {
      await createRetryQueue({ store_id: store.id, order_id: orderData.id, template_id: template.id, phone_number: phoneNumber, status: 'failed', error_message: apiResponse?.errorMessage || 'WhatsApp API error' });
      return { success: false, message: apiResponse?.errorMessage || 'WhatsApp API error' };
    }

    // Success
    await createRetryQueue({ store_id: store.id, order_id: orderData.id, template_id: template.id, phone_number: phoneNumber, status: 'sent' });

    return { success: true, message: `${action} WhatsApp sent` };
  } catch (error) {
    return { success: false, message: error.message };
  }
};