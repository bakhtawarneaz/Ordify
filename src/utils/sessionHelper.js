const Template = require('../models/template.model');
const Order = require('../models/order.model');
const { sendWhatsAppMessage } = require('./whatsappHelper');
const { isServiceActive } = require('../services/storeSetting.service');
const { logSuccess, logFailed } = require('./loggerHelper');

exports.sendSessionWhatsApp = async (store, orderId, meaning, channel) => {
  try {
    const sessionEnabled = await isServiceActive(store.id, 'session_template');
    if (!sessionEnabled) {
      return { success: true, message: 'Session template not enabled', skipped: true };
    }

    if (meaning !== 'confirm' && meaning !== 'cancel') {
      return { success: true, message: 'No session template for this meaning', skipped: true };
    }

    const action = meaning === 'confirm' ? 'session_confirm' : 'session_cancel';

    const template = await Template.findOne({
      where: { store_id: store.id, template_type: 'whatsapp', action },
    });

    if (!template) {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: `${action}_sent`, message: `Session template not found: ${action}` });
      return { success: false, message: `Session template not found: ${action}` };
    }

    const order = await Order.findOne({
      where: { order_id: orderId, store_id: store.id },
    });

    if (!order || !order.order_data) {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: `${action}_sent`, message: 'Order data not found for session template' });
      return { success: false, message: 'Order data not found' };
    }

    const sendResult = await sendWhatsAppMessage(order.order_data, template, store);
    const apiResponse = sendResult?.data?.data;
    const messageId = apiResponse?.result?.[0]?.messageId;

    if (messageId) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: `${action}_sent`, message: `Session ${meaning} WhatsApp sent`, details: { messageId, phone: apiResponse.result[0].number } });
      return { success: true, message: `Session ${meaning} WhatsApp sent`, messageId };
    }

    const errorMsg = apiResponse?.errorMessage || sendResult?.error || 'WhatsApp API error';
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: `${action}_sent`, message: `Session WhatsApp failed: ${errorMsg}` });
    return { success: false, message: errorMsg };
  } catch (error) {
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'session_template_sent', message: `Unexpected error: ${error.message}` });
    return { success: false, message: error.message };
  }
};