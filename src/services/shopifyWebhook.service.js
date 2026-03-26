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
const { logSuccess, logFailed } = require('../utils/loggerHelper');


exports.handleShopifyWebhook = async (orderData, topic) => {
  try {
    const match = orderData.order_status_url?.match(/\/\/([^\/]+)\//);
    const storeUrl = match ? match[1] : null;

    if (!storeUrl) {
      await logFailed({ store_id: null, store_name: null, order_id: orderData?.id, order_number: orderData?.name, channel: 'system', action: 'webhook_received', message: 'Could not identify store from order', details: { topic } });
      return { success: false, message: 'Could not identify store from order' };
    }

    const store = await Store.findOne({
      where: { store_url: { [Op.like]: `%${storeUrl}%` }, status: true },
    });

    if (!store) {
      await logFailed({ store_id: null, store_name: null, order_id: orderData?.id, order_number: orderData?.name, channel: 'system', action: 'webhook_received', message: 'Store not found or inactive', details: { storeUrl, topic } });
      return { success: false, message: 'Store not found or inactive' };
    }

    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'system', action: 'webhook_received', message: `Webhook received: ${topic}`, details: { topic } });

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
        await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'system', action: 'webhook_received', message: `Unknown webhook topic: ${topic}`, details: { topic } });
        return { success: false, message: `Unknown webhook topic: ${topic}` };
    }
  } catch (error) {
    console.error('Error in handleShopifyWebhook:', error.message);
    await logFailed({ store_id: null, store_name: null, order_id: orderData?.id, order_number: orderData?.name, channel: 'system', action: 'webhook_received', message: `Unexpected error: ${error.message}`, details: { error: error.message, topic } });
    return { success: false, message: error.message };
  }
};


const handleOrderCreate = async (store, orderData) => {
  try {
    const existingOrder = await Order.findOne({
      where: { store_id: store.id, order_id: orderData.id },
    });

    if (existingOrder) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'system', action: 'order_skipped', message: 'Order already processed' });
      return { success: false, message: 'Order already processed' };
    }

    await Order.create({
      store_id: store.id,
      order_id: orderData.id,
      order_number: orderData.name || orderData.order_number,
      order_data: orderData,
    });

    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'system', action: 'order_saved', message: 'Order saved successfully' });

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
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'system', action: 'order_created', message: 'Order saved, no services enabled' });
      return { success: true, message: 'Order saved, no services enabled' };
    }

    return { success: true, message: 'Order saved and services triggered', data: results };
  } catch (error) {
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'system', action: 'order_created', message: `Order create failed: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};


const handleOrderFulfilled = async (store, orderData) => {
  try {
    const fulfillments = orderData.fulfillments || [];
    const latestFulfillment = fulfillments[fulfillments.length - 1];

    if (!latestFulfillment) {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_fulfilled', message: 'No fulfillment data found' });
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
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_fulfilled', message: 'No fulfilled services active for this store' });
      return { success: true, message: 'No fulfilled services active for this store' };
    }

    return { success: true, message: 'Fulfilled services triggered', data: results };
  } catch (error) {
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_fulfilled', message: `Fulfilled error: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};


const handleOrderPaid = async (store, orderData) => {
  try {
    const paidActive = await isServiceActive(store.id, 'order_paid');

    if (!paidActive) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_paid', message: 'Order paid service not active for this store' });
      return { success: true, message: 'Order paid service not active for this store' };
    }

    const result = await sendEventWhatsApp(store, orderData, 'order_paid');
    return { service: 'order_paid', ...result };
  } catch (error) {
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_paid', message: `Order paid error: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};


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
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_updated', message: 'No updated services active or triggered' });
      return { success: true, message: 'No updated services active or triggered' };
    }

    return { success: true, message: 'Updated services triggered', data: results };
  } catch (error) {
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_updated', message: `Order updated error: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};


const sendEventWhatsApp = async (store, orderData, action, itemCount = null) => {
  try {
    let template = null;

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
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: `${action}_sent`, message: `Template not found for action: ${action}` });
      return { success: false, message: `Template not found for action: ${action}` };
    }

    const rawPhone = orderData?.billing_address?.phone || orderData?.customer?.phone || '';
    const phoneNumber = rawPhone.startsWith('03') ? rawPhone.replace(/^03/, '923') : rawPhone.replace(/^\+/, '');

    const sendResult = await sendWhatsAppMessage(orderData, template, store);

    // Network/token error
    if (!sendResult || sendResult.success === false) {
      const errorMsg = sendResult?.error || 'Failed to send';
      await createRetryQueue({ store_id: store.id, order_id: orderData.id, template_id: template.id, phone_number: phoneNumber, status: 'failed', error_message: errorMsg });
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: `${action}_sent`, message: `${action} WhatsApp failed to ${phoneNumber}`, details: { phone: phoneNumber, error: errorMsg, template_id: template.id } });
      return { success: false, message: errorMsg };
    }

    // API level error
    const apiResponse = sendResult?.data?.data;
    const messageId = apiResponse?.result?.[0]?.messageId;

    if (!messageId) {
      const errorMsg = apiResponse?.errorMessage || 'WhatsApp API error';
      await createRetryQueue({ store_id: store.id, order_id: orderData.id, template_id: template.id, phone_number: phoneNumber, status: 'failed', error_message: errorMsg });
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: `${action}_sent`, message: `${action} WhatsApp API error for ${phoneNumber}`, details: { phone: phoneNumber, error: errorMsg, template_id: template.id } });
      return { success: false, message: errorMsg };
    }

    // Success
    await createRetryQueue({ store_id: store.id, order_id: orderData.id, template_id: template.id, phone_number: phoneNumber, status: 'sent' });
    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: `${action}_sent`, message: `${action} WhatsApp sent to ${phoneNumber}`, details: { phone: phoneNumber, messageId, template_id: template.id } });

    return { success: true, message: `${action} WhatsApp sent` };
  } catch (error) {
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: `${action}_sent`, message: `Unexpected error: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};