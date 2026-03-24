const { Op } = require('sequelize');
const Store = require('../models/store.model');
const Order = require('../models/order.model');
const { handleWhatsAppSend } = require('../services/whatsappCallback.service');
const { handleVoiceCall } = require('../services/voiceCallback.service');
const { handleOrdifySend } = require('../services/ordifyCallback.service');

exports.handleOrderCreated = async (orderData) => {
  try {
    const match = orderData.order_status_url?.match(/\/\/([^\/]+)\//);
    const storeUrl = match ? match[1] : null;

    if (!storeUrl) {
      return { success: false, message: 'Could not identify store from order' };
    }

    const store = await Store.findOne({
      where: { store_url: { [Op.like]: `%${storeUrl}%` }, status: true },
    });

    if (!store) {
      return { success: false, message: 'Store not found or inactive' };
    }

    const existingOrder = await Order.findOne({
      where: { store_id: store.id, order_id: orderData.id },
    });

    if (existingOrder) {
      return { success: false, message: 'Order already processed' };
    }

    await Order.create({
      store_id: store.id,
      order_id: orderData.id,
      order_number: orderData.name || orderData.order_number,
      order_data: orderData,
    });

    const results = [];

    if (store.whatsapp_only) {
      const whatsappResult = await handleWhatsAppSend(store, orderData);
      results.push({ service: 'whatsapp', ...whatsappResult });
    }

    if (store.voice_only) {
      const voiceResult = await handleVoiceCall(orderData, store);
      results.push({ service: 'voice', ...voiceResult });
    }

    if (store.ordify_only) {
      const ordifyResult = await handleOrdifySend(orderData, store);
      results.push({ service: 'ordify', ...ordifyResult });
    }

    if (results.length === 0) {
      return { success: true, message: 'Order saved, no services enabled' };
    }

    return { success: true, message: 'Order saved and services triggered', data: results };
  } catch (error) {
    console.error('Error in handleOrderCreated:', JSON.stringify(error, null, 2));
    return { success: false, message: error.message };
  }
};