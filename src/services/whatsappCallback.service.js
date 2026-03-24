const { Op } = require('sequelize');
const Store = require('../models/store.model');
const Template = require('../models/template.model');
const WhatsAppMessageResponse = require('../models/whatsappMessageResponse.model');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');
const { hasExistingTag, findAndApplyTag } = require('../utils/tagHelper');
const { createLog } = require('../services/messageLog.service');

exports.handleWhatsAppSend = async (store, orderData) => {
  try {

    const isCOD = orderData.payment_gateway_names?.includes('Cash on Delivery (COD)');
    const rawPhone = orderData?.billing_address?.phone || orderData?.customer?.phone || '';
    const phoneNumber = rawPhone.startsWith('03') ? rawPhone.replace(/^03/, '923') : rawPhone.replace(/^\+/, '');

    if (store.post_paid && !store.pre_paid && !isCOD) {
      return { success: true, message: 'Not COD - WhatsApp skipped' };
    }

    if (store.pre_paid && !store.post_paid && isCOD) {
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
      return { success: false, message: 'WhatsApp template not found' };
    }

    const sendResult = await sendWhatsAppMessage(orderData, template, store);

    // Network/token error
    if (!sendResult || sendResult.success === false) {
      await createLog({ store_id: store.id, order_id: orderData.id, template_id: template.id, phone_number: phoneNumber, status: 'failed', error_message: sendResult?.error || 'Failed to send WhatsApp message' });
      return { success: false, message: sendResult?.error || 'Failed to send WhatsApp message' };
    }

    // API level error
    const apiResponse = sendResult?.data?.data;
    const messageId = apiResponse?.result?.[0]?.messageId;

    if (!messageId) {
      await createLog({ store_id: store.id, order_id: orderData.id, template_id: template.id, phone_number: phoneNumber, status: 'failed', error_message: apiResponse?.errorMessage || 'WhatsApp API error' });
      return { success: false, message: apiResponse?.errorMessage || 'WhatsApp API error' };
    }

    // Success
    await WhatsAppMessageResponse.create({ store_id: store.id, order_id: orderData.id, phone_number: apiResponse.result[0].number, message_id: messageId });
    await createLog({ store_id: store.id, order_id: orderData.id, template_id: template.id, phone_number: phoneNumber, status: 'sent' });

    return { success: true, message: 'WhatsApp message sent' };
  } catch (error) {
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
      return { success: false, message: 'Invalid message_id' };
    }

    const store = await Store.findOne({
      where: { id: messageResponse.store_id },
    });

    if (!store) {
      return { success: false, message: 'Store not found' };
    }

    const templates = await Template.findAll({
      where: { store_id: store.id, template_type: { [Op.in]: ['whatsapp', 'voice', 'ordify'] } },
    });

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
      return { success: false, message: 'Unknown button action' };
    }

    const { hasOurTag } = await hasExistingTag(store, messageResponse.order_id);

    if (hasOurTag) {
      return { success: true, message: 'Order already tagged' };
    }

    const tagResult = await findAndApplyTag(store, messageResponse.order_id, buttonMeaning, buttonChannel);

    return tagResult;
  } catch (error) {
    console.error('Error in handleWhatsAppCallback:', error.message);
    return { success: false, message: error.message };
  }
};