const Store = require('../models/store.model');
const Order = require('../models/order.model');
const { sendOrdify } = require('../utils/ordifyHelper');
const { hasExistingTag, findAndApplyTag } = require('../utils/tagHelper');
const { logSuccess, logFailed } = require('../utils/loggerHelper');
const { sendUnansweredWhatsApp } = require('../utils/unansweredHelper');

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
      const unansweredResult = await sendUnansweredWhatsApp(store, orderIdNum, 'ordify');
      return unansweredResult; 
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

    const tagResult = await findAndApplyTag(store, orderIdNum, meaning, 'ordify', existingTagsString);

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