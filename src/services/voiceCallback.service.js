const Store = require('../models/store.model');
const Template = require('../models/template.model');
const WhatsAppMessageResponse = require('../models/whatsappMessageResponse.model');
const { getOrderDetails } = require('../utils/shopifyHelper');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');
const { sendVoiceCall } = require('../utils/voiceHelper');
const { hasExistingTag, findAndApplyTag } = require('../utils/tagHelper');
const { logSuccess, logFailed } = require('../utils/loggerHelper');
const Order = require('../models/order.model');

exports.handleVoiceCall = async (orderData, store) => {
  try {
    if (!store.voice_only) {
      return { success: false, message: 'Voice not enabled for this store' };
    }

    const sendResult = await sendVoiceCall(orderData, store);

    if (!sendResult || sendResult.success === false) {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'voice', action: 'voice_call_sent', message: 'Voice call failed', details: { error: sendResult?.error || 'Failed to send voice call' } });
      return { success: false, message: sendResult?.error || 'Failed to send voice call' };
    }

    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'voice', action: 'voice_call_sent', message: 'Voice call sent', details: { phone: orderData?.billing_address?.phone || orderData?.customer?.phone } });
    return { success: true, message: 'Voice call sent' };
  } catch (error) {
    console.error('Error in handleVoiceCall:', error.message);
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'voice', action: 'voice_call_sent', message: `Unexpected error: ${error.message}`, details: { error: error.message } });
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
      await logFailed({ store_id: null, store_name: null, order_id: orderIdNum, channel: 'voice', action: 'voice_callback', message: 'storeId not found in orderId', details: { orderId } });
      return { success: false, message: 'storeId not found in orderId' };
    }

    const store = await Store.findOne({
      where: { store_id: storeId },
    });

    if (!store) {
      await logFailed({ store_id: null, store_name: null, order_id: orderIdNum, channel: 'voice', action: 'voice_callback', message: 'Store not found', details: { storeId } });
      return { success: false, message: 'Store not found' };
    }

    const action = userinput?.trim() || null;

    if (!action) {
      await sendUnansweredWhatsApp(store, orderIdNum);
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderIdNum, channel: 'voice', action: 'voice_unanswered', message: 'Voice unanswered - WhatsApp sent' });
      return { success: true, message: 'Voice unanswered - WhatsApp sent' };
    }

    const { hasOurTag } = await hasExistingTag(store, orderIdNum);

    const order = await Order.findOne({ where: { order_id: orderIdNum, store_id: store.id } });
    const orderNumber = order?.order_number || null;


    if (hasOurTag) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderIdNum, order_number: orderNumber, channel: 'voice', action: 'tag_skipped', message: 'Order already tagged', details: { userinput: action } });
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
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderIdNum, order_number: orderNumber, channel: 'voice', action: 'voice_callback', message: `Invalid action: ${action}`, details: { userinput: action } });
      return { success: false, message: 'Invalid action' };
    }

    const tagResult = await findAndApplyTag(store, orderIdNum, meaning, 'voice');

    if (tagResult.success) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderIdNum, order_number: orderNumber, channel: 'voice', action: 'tag_added', message: `Tag "${tagResult.tag}" added via voice`, details: { tag: tagResult.tag, meaning, userinput: action } });
    } else {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderIdNum, order_number: orderNumber, channel: 'voice', action: 'tag_added', message: `Tag failed: ${tagResult.message}`, details: { meaning, userinput: action } });
    }

    return tagResult;
  } catch (error) {
    console.error('Error in handleVoiceCallback:', error.message);
    await logFailed({ store_id: null, store_name: null, order_id: null, channel: 'voice', action: 'voice_callback', message: `Unexpected error: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};

const sendUnansweredWhatsApp = async (store, orderId) => {
  try {
    const template = await Template.findOne({
      where: { store_id: store.id, template_type: 'voice', action: 'voice_unanswered' },
    });

    if (!template) {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel: 'voice', action: 'unanswered_whatsapp_sent', message: 'Voice unanswered template not found' });
      return;
    }

    const orderDetails = await getOrderDetails(store, orderId);
    if (!orderDetails) {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel: 'voice', action: 'unanswered_whatsapp_sent', message: 'Order details not found from Shopify' });
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
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel: 'voice', action: 'unanswered_whatsapp_sent', message: 'Unanswered WhatsApp sent', details: { phone: apiResponse.result[0].number, messageId } });
    } else {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel: 'voice', action: 'unanswered_whatsapp_sent', message: 'Unanswered WhatsApp failed - no messageId', details: { error: apiResponse?.errorMessage } });
    }
  } catch (error) {
    console.error('Error sending unanswered WhatsApp:', error.message);
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel: 'voice', action: 'unanswered_whatsapp_sent', message: `Unexpected error: ${error.message}`, details: { error: error.message } });
  }
};