const Template = require('../models/template.model');
const WhatsAppMessageResponse = require('../models/whatsappMessageResponse.model');
const { getOrderDetails } = require('./shopifyHelper');
const { sendWhatsAppMessage } = require('./whatsappHelper');
const { logSuccess, logFailed } = require('./loggerHelper');

exports.sendUnansweredWhatsApp = async (store, orderId, channel) => {
  try {
    const template = await Template.findOne({
      where: { store_id: store.id, template_type: channel, action: `${channel}_unanswered` },
    });

    if (!template) {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'unanswered_whatsapp_sent', message: `${channel} unanswered template not found` });
      return { success: false, message: `${channel} unanswered template not found` };
    }

    const orderDetails = await getOrderDetails(store, orderId);
    if (!orderDetails) {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'unanswered_whatsapp_sent', message: 'Order details not found from Shopify' });
      return { success: false, message: 'Order details not found from Shopify' };
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
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'unanswered_whatsapp_sent', message: 'Unanswered WhatsApp sent', details: { phone: apiResponse.result[0].number, messageId } });
      return { success: true, message: 'Unanswered WhatsApp sent' };
    }

    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'unanswered_whatsapp_sent', message: 'Unanswered WhatsApp failed - no messageId', details: { error: apiResponse?.errorMessage } });
    return { success: false, message: apiResponse?.errorMessage || 'WhatsApp failed' };

  } catch (error) {
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'unanswered_whatsapp_sent', message: `Unexpected error: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};