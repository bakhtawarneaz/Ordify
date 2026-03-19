const Store = require('../models/store.model');
const Template = require('../models/template.model');
const WhatsAppMessageResponse = require('../models/whatsappMessageResponse.model');
const { getOrderDetails } = require('../utils/shopifyHelper');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');
const { sendVoiceCall } = require('../utils/voiceHelper');
const { hasExistingTag, findAndApplyTag } = require('../utils/tagHelper');

exports.handleVoiceCall = async (orderData, store) => {
  try {
    if (!store.voice_only) {
      return { success: false, message: 'Voice not enabled for this store' };
    }
 
    const sendResult = await sendVoiceCall(orderData, store);
 
    if (!sendResult || sendResult.success === false) {
      return { success: false, message: sendResult?.error || 'Failed to send voice call' };
    }
 
    return { success: true, message: 'Voice call sent' };
  } catch (error) {
    console.error('Error in handleVoiceCall:', error.message);
    return { success: false, message: error.message };
  }
};
 
 
exports.handleVoiceCallback = async (callbackData) => {
  try {
    const { orderId, userinput } = callbackData;
 
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
 
    const action = userinput?.trim() || null;
 
    if (!action) {
      await sendUnansweredWhatsApp(store, orderIdNum);
      return { success: true, message: 'Voice unanswered - WhatsApp sent' };
    }
 
    const { hasOurTag } = await hasExistingTag(store, orderIdNum);
 
    if (hasOurTag) {
      return { success: true, message: 'Order already tagged' };
    }
 
    let meaning = null;
 
    if (action === '1') {
      meaning = 'confirm';
    } else if (action === '2') {
      meaning = 'cancel';
    } else if (action === '3') {
      meaning = 'agent';
    } else {
      return { success: false, message: 'Invalid action' };
    }
 
    const tagResult = await findAndApplyTag(store, orderIdNum, meaning, 'voice');
 
    return tagResult;
  } catch (error) {
    console.error('Error in handleVoiceCallback:', error.message);
    return { success: false, message: error.message };
  }
};
 
 
const sendUnansweredWhatsApp = async (store, orderId) => {
  try {
    const template = await Template.findOne({
      where: { store_id: store.id, template_type: 'voice', action: 'voice_unanswered' },
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
    console.error('Error sending unanswered WhatsApp:', error.message);
  }
};