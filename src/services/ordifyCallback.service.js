const Store = require('../models/store.model');
const Template = require('../models/template.model');
const WhatsAppMessageResponse = require('../models/whatsappMessageResponse.model');
const { getOrderDetails } = require('../utils/shopifyHelper');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');
const { sendOrdify } = require('../utils/ordifyHelper');
const { hasExistingTag, findAndApplyTag } = require('../utils/tagHelper');

exports.handleOrdifySend = async (orderData, store) => {
  try {
    
    if (!store.ordify_only) {
      return { success: false, message: 'Ordify not enabled for this store' };
    }
    
    const sendResult = await sendOrdify(orderData, store);
 
    if (!sendResult || sendResult.success === false) {
      return { success: false, message: sendResult?.error || 'Failed to send Ordify message' };
    }
 
    return { success: true, message: 'Ordify message sent' };
  } catch (error) {
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
      return { success: false, message: 'storeId not found in orderId' };
    }

    const store = await Store.findOne({
      where: { store_id: storeId },
    });

    if (!store) {
      return { success: false, message: 'Store not found' };
    }

    const action = status?.trim() || null;

    if (!action) {
      await sendOrdifyUnansweredWhatsApp(store, orderIdNum);
      return { success: true, message: 'Ordify unanswered - WhatsApp sent' };
    }

    const { hasOurTag } = await hasExistingTag(store, orderIdNum);

    if (hasOurTag) {
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
      return { success: false, message: 'Invalid action' };
    }

    const tagResult = await findAndApplyTag(store, orderIdNum, meaning, 'ordify');

    return tagResult;
  } catch (error) {
    console.error('Error in handleOrdifyCallback:', error.message);
    return { success: false, message: error.message };
  }
};


const sendOrdifyUnansweredWhatsApp = async (store, orderId) => {
  try {
    const template = await Template.findOne({
      where: { store_id: store.id, template_type: 'ordify', action: 'ordify_unanswered' },
    });

    if (!template) return;

    const orderDetails = await getOrderDetails(store, orderId);
    if (!orderDetails) return;

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
    }
  } catch (error) {
    console.error('Error sending ordify unanswered WhatsApp:', error.message);
  }
};