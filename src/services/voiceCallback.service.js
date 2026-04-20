const Store = require('../models/store.model');
const { sendVoiceCall } = require('../utils/voiceHelper');
const { hasExistingTag } = require('../utils/tagHelper');
const { logSuccess, logFailed } = require('../utils/loggerHelper');
const Order = require('../models/order.model');
const VoiceResponse = require('../models/voiceResponse.model');
const { sendUnansweredWhatsApp } = require('../utils/unansweredHelper');
const { isServiceActive } = require('../services/storeSetting.service');
const { handlePostCallbackActions } = require('../utils/orderActionHelper');
const { extractPhoneFromOrder } = require('../utils/phoneHelper');
const { voiceReattemptQueue } = require('../config/queue');

exports.handleVoiceCall = async (orderData, store) => {
  try {

    const voiceActive = await isServiceActive(store.id, 'voice_only');
    if (!voiceActive) {
      return { success: false, message: 'Voice not enabled for this store' };
    }

    const phoneNumber = extractPhoneFromOrder(orderData);
    const sendResult = await sendVoiceCall(orderData, store);

    if (!sendResult || sendResult.success === false) {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'voice', action: 'voice_call_sent', message: 'Voice call failed', details: { error: sendResult?.error || 'Failed to send voice call' } });
      return { success: false, message: sendResult?.error || 'Failed to send voice call' };
    }

    const cdrId = sendResult?.CdrID || null;

    // Save voice response
    const voiceResponse = await VoiceResponse.create({
      store_id: store.id,
      order_id: orderData.id,
      phone_number: phoneNumber,
      cdr_id: cdrId,
    });

    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'voice', action: 'voice_call_sent', message: 'Voice call sent', details: { phone: phoneNumber, cdrId } });

    // Schedule reattempt if enabled
    const voiceReattemptActive = await isServiceActive(store.id, 'voice_reattempt');
    if (voiceReattemptActive && voiceResponse) {
      const delayMinutesSetting = store.voice_reattempt_delay_minutes || 60;
      const delayMinutes = parseInt(delayMinutesSetting) || 60;
      const delayMs = delayMinutes * 60 * 1000;

      await voiceReattemptQueue.add('voice-reattempt-check', {
        voiceResponseId: voiceResponse.id,
      }, {
        delay: delayMs,
        attempts: 2,
        backoff: { type: 'exponential', delay: 30000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });

      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'voice', action: 'voice_reattempt_scheduled', message: `Voice reattempt scheduled after ${delayMinutes} minutes` });
    }

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
      const unansweredActive = await isServiceActive(store.id, 'unanswered_whatsapp');
      if (unansweredActive) {
        const unansweredResult = await sendUnansweredWhatsApp(store, orderIdNum, 'voice');
        return unansweredResult;
      }
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderIdNum, channel: 'voice', action: 'unanswered_skipped', message: 'Unanswered WhatsApp not enabled for this store' });
      return { success: true, message: 'Unanswered WhatsApp not enabled' };
    }

    const { hasOurTag, existingTagsString } = await hasExistingTag(store, orderIdNum);
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

    const actionResults = await handlePostCallbackActions(store, orderIdNum, meaning, 'voice', existingTagsString, { userinput: action });

    if (actionResults.tag && actionResults.tag.success && !actionResults.tag.skipped) {
      await VoiceResponse.update(
        { action_taken: true },
        { where: { store_id: store.id, order_id: orderIdNum } }
      );
    }

    return { success: true, message: 'Voice callback processed', data: actionResults };

  } catch (error) {
    console.error('Error in handleVoiceCallback:', error.message);
    await logFailed({ store_id: null, store_name: null, order_id: null, channel: 'voice', action: 'voice_callback', message: `Unexpected error: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};