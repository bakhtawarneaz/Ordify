const { Op } = require('sequelize');
const Store = require('../models/store.model');
const Order = require('../models/order.model');
const Template = require('../models/template.model');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');
const { createRetryQueue } = require('../services/retryQueue.service');
const { logSuccess, logFailed } = require('../utils/loggerHelper');
const { getActiveServices } = require('../services/storeService.service');
const { extractPhoneFromOrder } = require('../utils/phoneHelper');
const { notificationQueue } = require('../config/queue');
const { handleFeedbackOnFulfilled } = require('../services/feedback.service');

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

    const queued = [];

    if (store.whatsapp_only) {
      await notificationQueue.add('whatsapp', {
        type: 'whatsapp',
        store: { id: store.id, store_name: store.store_name, store_id: store.store_id, store_url: store.store_url, access_token: store.access_token, api_key: store.api_key, post_paid: store.post_paid, pre_paid: store.pre_paid, whatsapp_only: store.whatsapp_only },
        orderData,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      queued.push('whatsapp');
    }

    if (store.voice_only) {
      await notificationQueue.add('voice', {
        type: 'voice',
        store: { id: store.id, store_name: store.store_name, store_id: store.store_id, store_url: store.store_url, access_token: store.access_token, api_key: store.api_key, campaign_id: store.campaign_id, voice_only: store.voice_only },
        orderData,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      queued.push('voice');
    }

    if (store.ordify_only) {
      await notificationQueue.add('ordify', {
        type: 'ordify',
        store: { id: store.id, store_name: store.store_name, store_id: store.store_id, store_url: store.store_url, access_token: store.access_token, api_key: store.api_key, sender: store.sender, brand_name: store.brand_name, ordify_only: store.ordify_only },
        orderData,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      queued.push('ordify');
    }

    if (queued.length === 0) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'system', action: 'order_created', message: 'Order saved, no services enabled' });
      return { success: true, message: 'Order saved, no services enabled' };
    }

    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'system', action: 'order_queued', message: `Order saved, ${queued.join(', ')} queued`, details: { queued } });
    return { success: true, message: `Order saved, ${queued.join(', ')} queued` };
  } catch (error) {
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'system', action: 'order_created', message: `Order create failed: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};

const handleOrderFulfilled = async (store, orderData) => {
  try {
    const fulfillments = orderData.fulfillments || [];
    const latestFulfillment = fulfillments[fulfillments.length - 1];

    const services = await getActiveServices(store.id);
    const results = [];

    const feedbackActive = services.isActive('order_feedback');
    if (feedbackActive) {
      const feedbackResult = await handleFeedbackOnFulfilled(store, orderData);
      results.push({ service: 'order_feedback', ...feedbackResult });
    }

    if (!latestFulfillment) {
      if (results.length > 0) {
        return { success: true, message: 'Fulfilled services triggered', data: results };
      }
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_fulfilled', message: 'No fulfillment data found' });
      return { success: false, message: 'No fulfillment data found' };
    }

    const itemCount = latestFulfillment.line_items?.length || 0;

    const order = await Order.findOne({
      where: { store_id: store.id, order_id: orderData.id },
    });

    // Split order service
    const splitActive = services.isActive('order_split');
    if (splitActive && itemCount > 0) {
      if (order?.split_notified) {
        await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_split', message: 'Split notification already sent - skipped' });
      } else {
        const splitResult = await sendEventWhatsApp(store, orderData, 'split_order', itemCount);
        results.push({ service: 'order_split', ...splitResult });

        if (splitResult.success && order) {
          await order.update({ split_notified: true });
        }
      }
    }

    // Dispatch service
    const dispatchActive = services.isActive('order_dispatch');
    if (dispatchActive) {
      if (order?.dispatch_notified) {
        await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_dispatch', message: 'Dispatch notification already sent - skipped' });
      } else {
        const dispatchResult = await sendEventWhatsApp(store, orderData, 'order_dispatch');
        results.push({ service: 'order_dispatch', ...dispatchResult });

        if (dispatchResult.success && order) {
          await order.update({ dispatch_notified: true });
        }
      }
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

// const handleOrderFulfilled = async (store, orderData) => {
//   try {
//     const fulfillments = orderData.fulfillments || [];
//     const latestFulfillment = fulfillments[fulfillments.length - 1];

//     if (!latestFulfillment) {
//       await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_fulfilled', message: 'No fulfillment data found' });
//       return { success: false, message: 'No fulfillment data found' };
//     }

//     const itemCount = latestFulfillment.line_items?.length || 0;
//     const results = [];
//     const services = await getActiveServices(store.id);

//     const order = await Order.findOne({
//       where: { store_id: store.id, order_id: orderData.id },
//     });

//     // Split order service
//     const splitActive = services.isActive('order_split');
//     if (splitActive && itemCount > 0) {
//       if (order?.split_notified) {
//         await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_split', message: 'Split notification already sent - skipped' });
//       } else {
//         const splitResult = await sendEventWhatsApp(store, orderData, 'split_order', itemCount);
//         results.push({ service: 'order_split', ...splitResult });

//         if (splitResult.success && order) {
//           await order.update({ split_notified: true });
//         }
//       }
//     }

//     // Dispatch service
//     const dispatchActive = services.isActive('order_dispatch');
//     if (dispatchActive) {
//       if (order?.dispatch_notified) {
//         await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_dispatch', message: 'Dispatch notification already sent - skipped' });
//       } else {
//         const dispatchResult = await sendEventWhatsApp(store, orderData, 'order_dispatch');
//         results.push({ service: 'order_dispatch', ...dispatchResult });

//         if (dispatchResult.success && order) {
//           await order.update({ dispatch_notified: true });
//         }
//       }
//     }

//     if (results.length === 0) {
//       await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_fulfilled', message: 'No fulfilled services active for this store' });
//       return { success: true, message: 'No fulfilled services active for this store' };
//     }

//     return { success: true, message: 'Fulfilled services triggered', data: results };
//   } catch (error) {
//     await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_fulfilled', message: `Fulfilled error: ${error.message}`, details: { error: error.message } });
//     return { success: false, message: error.message };
//   }
// };


const handleOrderPaid = async (store, orderData) => {
  try {
    const services = await getActiveServices(store.id);
    const paidActive = services.isActive('order_paid');

    if (!paidActive) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_paid', message: 'Order paid service not active for this store' });
      return { success: true, message: 'Order paid service not active for this store' };
    }

    const order = await Order.findOne({
      where: { store_id: store.id, order_id: orderData.id },
    });

    if (order?.paid_notified) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_paid', message: 'Paid notification already sent - skipped' });
      return { success: true, message: 'Paid notification already sent - skipped' };
    }

    const result = await sendEventWhatsApp(store, orderData, 'order_paid');

    if (result.success && order) {
      await order.update({ paid_notified: true });
    }

    return { service: 'order_paid', ...result };
  } catch (error) {
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_paid', message: `Order paid error: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};


const handleOrderUpdated = async (store, orderData) => {
  try {
    const results = [];
    const services = await getActiveServices(store.id);

    const order = await Order.findOne({
      where: { store_id: store.id, order_id: orderData.id },
    });

    // Delivered service
    const deliveredActive = services.isActive('order_delivered');
    if (deliveredActive) {
      if (order?.delivered_notified) {
        await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_delivered', message: 'Delivered notification already sent - skipped' });
      } else {
        const fulfillments = orderData.fulfillments || [];
        const isDelivered = fulfillments.some(f => f.shipment_status === 'delivered');

        if (isDelivered) {
          const deliveredResult = await sendEventWhatsApp(store, orderData, 'order_delivered');
          results.push({ service: 'order_delivered', ...deliveredResult });

          if (deliveredResult.success && order) {
            await order.update({ delivered_notified: true });
          }
        }
      }
    }

    // Tracking service
    const trackingActive = services.isActive('order_tracking');
    if (trackingActive) {
      if (order?.tracking_notified) {
        await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'order_tracking', message: 'Tracking notification already sent - skipped' });
      } else {
        const fulfillments = orderData.fulfillments || [];
        const hasTracking = fulfillments.some(f => f.tracking_number);

        if (hasTracking) {
          const trackingResult = await sendEventWhatsApp(store, orderData, 'order_tracking');
          results.push({ service: 'order_tracking', ...trackingResult });

          if (trackingResult.success && order) {
            await order.update({ tracking_notified: true });
          }
        }
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

    const phoneNumber = extractPhoneFromOrder(orderData);
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