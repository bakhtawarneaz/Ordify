const Store = require('../models/store.model');
const Order = require('../models/order.model');
const { sendOrdify } = require('../utils/ordifyHelper');
const { hasExistingTag } = require('../utils/tagHelper');
const { logSuccess, logFailed } = require('../utils/loggerHelper');
const { sendUnansweredWhatsApp } = require('../utils/unansweredHelper');
const { isServiceActive } = require('../services/storeSetting.service');
const { handlePostCallbackActions } = require('../utils/orderActionHelper');
const OrdifyResponse = require('../models/ordifyResponse.model');
const { extractPhoneFromOrder } = require('../utils/phoneHelper');

exports.handleOrdifySend = async (orderData, store) => {
  try {

    const ordifyActive = await isServiceActive(store.id, 'ordify_only');
    if (!ordifyActive) {
      return { success: false, message: 'Ordify not enabled for this store' };
    }

    const sendResult = await sendOrdify(orderData, store);

    if (!sendResult || sendResult?.response?.status !== 'Success') {
      const errorMsg = sendResult?.error || sendResult?.response?.description || 'Failed to send Ordify message';
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'ordify', action: 'ordify_sent', message: 'Ordify message failed', details: { error: errorMsg } });
      return { success: false, message: errorMsg };
    }

    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'ordify', action: 'ordify_sent', message: 'Ordify message sent' });

    const msgId = sendResult?.response?.numberlist?.[0]?.msgid || null;
    const phoneNumber = sendResult?.response?.numberlist?.[0]?.number || extractPhoneFromOrder(orderData);
    const trackLink = sendResult?.response?.tracklink || null;

    await OrdifyResponse.create({
      store_id: store.id,
      order_id: orderData.id,
      phone_number: phoneNumber,
      msg_id: msgId,
      track_link: trackLink,
    });
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
      const unansweredActive = await isServiceActive(store.id, 'unanswered_whatsapp');
      if (unansweredActive) {
        const unansweredResult = await sendUnansweredWhatsApp(store, orderIdNum, 'ordify');
        return unansweredResult;
      }
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderIdNum, channel: 'ordify', action: 'unanswered_skipped', message: 'Unanswered WhatsApp not enabled for this store' });
      return { success: true, message: 'Unanswered WhatsApp not enabled' };
    }

    const { hasOurTag, existingTagsString } = await hasExistingTag(store, orderIdNum);

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

    const actionResults = await handlePostCallbackActions(store, orderIdNum, meaning, 'ordify', existingTagsString, { status: action });
    return { success: true, message: 'Ordify callback processed', data: actionResults };

  } catch (error) {
    console.error('Error in handleOrdifyCallback:', error.message);
    await logFailed({ store_id: null, store_name: null, order_id: null, channel: 'ordify', action: 'ordify_callback', message: `Unexpected error: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};