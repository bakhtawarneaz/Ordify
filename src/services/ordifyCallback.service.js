const Store = require('../models/store.model');
const Template = require('../models/template.model');
const WhatsAppMessageResponse = require('../models/whatsappMessageResponse.model');
const Order = require('../models/order.model');
const { getOrderDetails } = require('../utils/shopifyHelper');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');
const { sendOrdify } = require('../utils/ordifyHelper');
const { hasExistingTag, findAndApplyTag } = require('../utils/tagHelper');
const { logSuccess, logFailed } = require('../utils/loggerHelper');

exports.handleOrdifySend = async (orderData, store) => {
  try {

    if (!store.ordify_only) {
      return { success: false, message: 'Ordify not enabled for this store' };
    }

    const sendResult = await sendOrdify(orderData, store);

    if (!sendResult || sendResult.success === false) {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'ordify', action: 'ordify_sent', message: 'Ordify message failed', details: { error: sendResult?.error || 'Failed to send Ordify message' } });
      return { success: false, message: sendResult?.error || 'Failed to send Ordify message' };
    }

    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'ordify', action: 'ordify_sent', message: 'Ordify message sent' });
    return { success: true, message: 'Ordify message sent' };
  } catch (error) {
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'ordify', action: 'ordify_sent', message: `Unexpected error: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};

exports.handleOrdifyCallback = async (callbackData) => {
  try {
    const { orderId, status, channel } = callbackData;

    if (!orderId) {
      return { success: false, message: 'orderId is required' };
    }

    const parts = orderId.split(',');
    const orderIdNum = parts[0];
    const storeId = parts[1] || null;

    if (!storeId) {
      await logFailed({ store_id: null, store_name: null, order_id: orderIdNum, channel: 'ordify', action: 'ordify_callback', message: 'storeId not found in orderId', details: { orderId } });
      return { success: false, message: 'storeId not found in orderId' };
    }

    const store = await Store.findOne({
      where: { store_id: storeId },
    });

    if (!store) {
      await logFailed({ store_id: null, store_name: null, order_id: orderIdNum, channel: 'ordify', action: 'ordify_callback', message: 'Store not found', details: { storeId } });
      return { success: false, message: 'Store not found' };
    }

    const action = status?.trim() || null;

    if (!action) {
      await sendOrdifyUnansweredWhatsApp(store, orderIdNum);
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderIdNum, channel: 'ordify', action: 'ordify_unanswered', message: 'Ordify unanswered - WhatsApp sent' });
      return { success: true, message: 'Ordify unanswered - WhatsApp sent' };
    }

    const { hasOurTag } = await hasExistingTag(store, orderIdNum);

    const order = await Order.findOne({ where: { order_id: orderIdNum, store_id: store.id } });
    const orderNumber = order?.order_number || null;

    if (hasOurTag) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderIdNum, order_number: orderNumber, channel: 'ordify', action: 'tag_skipped', message: 'Order already tagged', details: { status: action } });
      return { success: true, message: 'Order already tagged' };
    }

    let meaning = null;

    if (action === 'confirmed') {
      meaning = 'confirm';
    } else if (action === 'cancelled') {
      meaning = 'cancel';
    } else if (action === 'callTagged') {
      meaning = 'agent';
    } else {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderIdNum, order_number: orderNumber, channel: 'ordify', action: 'ordify_callback', message: `Invalid action: ${action}`, details: { status: action } });
      return { success: false, message: 'Invalid action' };
    }

    const tagResult = await findAndApplyTag(store, orderIdNum, meaning, 'ordify');

    if (tagResult.success) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderIdNum, order_number: orderNumber, channel: 'ordify', action: 'tag_added', message: `Tag "${tagResult.tag}" added via ordify`, details: { tag: tagResult.tag, meaning, status: action } });
    } else {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderIdNum, order_number: orderNumber, channel: 'ordify', action: 'tag_added', message: `Tag failed: ${tagResult.message}`, details: { meaning, status: action } });
    }

    return tagResult;
  } catch (error) {
    console.error('Error in handleOrdifyCallback:', error.message);
    await logFailed({ store_id: null, store_name: null, order_id: null, channel: 'ordify', action: 'ordify_callback', message: `Unexpected error: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};

const sendOrdifyUnansweredWhatsApp = async (store, orderId) => {
  try {
    const template = await Template.findOne({
      where: { store_id: store.id, template_type: 'ordify', action: 'ordify_unanswered' },
    });

    if (!template) {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel: 'ordify', action: 'unanswered_whatsapp_sent', message: 'Ordify unanswered template not found' });
      return;
    }

    const orderDetails = await getOrderDetails(store, orderId);
    if (!orderDetails) {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel: 'ordify', action: 'unanswered_whatsapp_sent', message: 'Order details not found from Shopify' });
      return;
    }

    const sendResult = await sendWhatsAppMessage(orderDetails, template, store);

    const apiResponse = sendResult?.data?.data;
    const messageId = apiResponse?.result?.[0]?.messageId;

    if (messageId) {
      await WhatsAppMessageResponse.create({
        store_id: store.id,
        order_id: orderId,
        phone_number: apiResponse.result[0].number,
        message_id: messageId,
      });
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel: 'ordify', action: 'unanswered_whatsapp_sent', message: 'Unanswered WhatsApp sent', details: { phone: apiResponse.result[0].number, messageId } });
    } else {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel: 'ordify', action: 'unanswered_whatsapp_sent', message: 'Unanswered WhatsApp failed - no messageId', details: { error: apiResponse?.errorMessage } });
    }
  } catch (error) {
    console.error('Error sending ordify unanswered WhatsApp:', error.message);
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel: 'ordify', action: 'unanswered_whatsapp_sent', message: `Unexpected error: ${error.message}`, details: { error: error.message } });
  }
};