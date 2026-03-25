const { Op } = require('sequelize');
const Store = require('../models/store.model');
const Template = require('../models/template.model');
const WhatsAppMessageResponse = require('../models/whatsappMessageResponse.model');
const Order = require('../models/order.model');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');
const { hasExistingTag, findAndApplyTag } = require('../utils/tagHelper');
const { createRetryQueue } = require('../services/retryQueue.service');
const { logSuccess, logFailed } = require('../utils/loggerHelper');

exports.handleWhatsAppSend = async (store, orderData) => {
  try {

    const isCOD = orderData.payment_gateway_names?.includes('Cash on Delivery (COD)');
    const rawPhone = orderData?.billing_address?.phone || orderData?.customer?.phone || '';
    const phoneNumber = rawPhone.startsWith('03') ? rawPhone.replace(/^03/, '923') : rawPhone.replace(/^\+/, '');

    if (store.post_paid && !store.pre_paid && !isCOD) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'whatsapp', action: 'whatsapp_skipped', message: 'Not COD - WhatsApp skipped' });
      return { success: true, message: 'Not COD - WhatsApp skipped' };
    }

    if (store.pre_paid && !store.post_paid && isCOD) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'whatsapp', action: 'whatsapp_skipped', message: 'COD order - WhatsApp skipped for prepaid only store' });
      return { success: true, message: 'COD order - WhatsApp skipped for prepaid only store' };
    }

    const paymentType = isCOD ? 'post_paid' : 'pre_paid';

    let template = await Template.findOne({
      where: { store_id: store.id, template_type: 'whatsapp', payment_type: paymentType },
    });

    if (!template) {
      template = await Template.findOne({
        where: { store_id: store.id, template_type: 'whatsapp', payment_type: 'both' },
      });
    }

    if (!template) {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'whatsapp', action: 'whatsapp_sent', message: 'WhatsApp template not found' });
      return { success: false, message: 'WhatsApp template not found' };
    }

    const sendResult = await sendWhatsAppMessage(orderData, template, store);

    // Network/token error
    if (!sendResult || sendResult.success === false) {
      const errorMsg = sendResult?.error || 'Failed to send WhatsApp message';
      await createRetryQueue({ store_id: store.id, order_id: orderData.id, template_id: template.id, phone_number: phoneNumber, status: 'failed', error_message: errorMsg });
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'whatsapp', action: 'whatsapp_sent', message: `WhatsApp failed to ${phoneNumber}`, details: { phone: phoneNumber, error: errorMsg, template_id: template.id } });
      return { success: false, message: errorMsg };
    }

    // API level error
    const apiResponse = sendResult?.data?.data;
    const messageId = apiResponse?.result?.[0]?.messageId;

    if (!messageId) {
      const errorMsg = apiResponse?.errorMessage || 'WhatsApp API error';
      await createRetryQueue({ store_id: store.id, order_id: orderData.id, template_id: template.id, phone_number: phoneNumber, status: 'failed', error_message: errorMsg });
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'whatsapp', action: 'whatsapp_sent', message: `WhatsApp API error for ${phoneNumber}`, details: { phone: phoneNumber, error: errorMsg, template_id: template.id } });
      return { success: false, message: errorMsg };
    }

    // Success
    await WhatsAppMessageResponse.create({ store_id: store.id, order_id: orderData.id, phone_number: apiResponse.result[0].number, message_id: messageId });
    await createRetryQueue({ store_id: store.id, order_id: orderData.id, template_id: template.id, phone_number: phoneNumber, status: 'sent' });
    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderData.id, order_number: orderData.name, channel: 'whatsapp', action: 'whatsapp_sent', message: `WhatsApp sent to ${phoneNumber}`, details: { phone: phoneNumber, messageId, template_id: template.id } });

    return { success: true, message: 'WhatsApp message sent' };
  } catch (error) {
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderData?.id, order_number: orderData?.name, channel: 'whatsapp', action: 'whatsapp_sent', message: `Unexpected error: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};

exports.handleWhatsAppCallback = async (callbackData) => {
  try {
    const { message_id, action } = callbackData;

    if (!message_id || !action) {
      return { success: false, message: 'message_id and action are required' };
    }

    const messageResponse = await WhatsAppMessageResponse.findOne({
      where: { message_id },
    });

    if (!messageResponse) {
      await logFailed({ store_id: null, store_name: null, order_id: null, channel: 'whatsapp', action: 'whatsapp_callback', message: `Invalid message_id: ${message_id}`, details: { message_id } });
      return { success: false, message: 'Invalid message_id' };
    }

    const store = await Store.findOne({
      where: { id: messageResponse.store_id },
    });

    if (!store) {
      await logFailed({ store_id: messageResponse.store_id, store_name: null, order_id: messageResponse.order_id, channel: 'whatsapp', action: 'whatsapp_callback', message: 'Store not found', details: { message_id } });
      return { success: false, message: 'Store not found' };
    }

    const templates = await Template.findAll({
      where: { store_id: store.id, template_type: { [Op.in]: ['whatsapp', 'voice', 'ordify'] } },
    });

    const order = await Order.findOne({ where: { order_id: messageResponse.order_id, store_id: store.id } });
    const orderNumber = order?.order_number || null;

    let buttonMeaning = null;
    let buttonChannel = null;
    for (const template of templates) {
      if (template.buttons && Array.isArray(template.buttons)) {
        const matchedButton = template.buttons.find(btn => btn.text === action);
        if (matchedButton) {
          buttonMeaning = matchedButton.meaning;
          buttonChannel = template.template_type;
          break;
        }
      }
    }

    if (!buttonMeaning) {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: messageResponse.order_id, order_number: orderNumber, channel: 'whatsapp', action: 'whatsapp_callback', message: `Unknown button action: ${action}`, details: { message_id, action } });
      return { success: false, message: 'Unknown button action' };
    }

    const { hasOurTag } = await hasExistingTag(store, messageResponse.order_id);

    if (hasOurTag) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: messageResponse.order_id, order_number: orderNumber, channel: buttonChannel, action: 'tag_skipped', message: 'Order already tagged', details: { message_id, button_action: action } });
      return { success: true, message: 'Order already tagged' };
    }

    const tagResult = await findAndApplyTag(store, messageResponse.order_id, buttonMeaning, buttonChannel);

    if (tagResult.success) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: messageResponse.order_id, order_number: orderNumber, channel: buttonChannel, action: 'tag_added', message: `Tag "${tagResult.tag}" added`, details: { tag: tagResult.tag, meaning: buttonMeaning, button_action: action } });
    } else {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: messageResponse.order_id, order_number: orderNumber, channel: buttonChannel, action: 'tag_added', message: `Tag failed: ${tagResult.message}`, details: { meaning: buttonMeaning, button_action: action } });
    }

    return tagResult;
  } catch (error) {
    console.error('Error in handleWhatsAppCallback:', error.message);
    await logFailed({ store_id: null, store_name: null, order_id: null, channel: 'whatsapp', action: 'whatsapp_callback', message: `Unexpected error: ${error.message}`, details: { error: error.message } });
    return { success: false, message: error.message };
  }
};