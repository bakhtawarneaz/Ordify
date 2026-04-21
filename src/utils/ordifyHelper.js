const axios = require('axios');
const { extractPhoneFromOrder } = require('./phoneHelper');
const ORDIFY_API_URL = 'https://ordifyapi.its.com.pk/order';

exports.sendOrdify = async (order, store) => {
  try {
    const customerName = `${order?.billing_address?.first_name || ''} ${order?.billing_address?.last_name || ''}`.trim();
    const phoneNumber = extractPhoneFromOrder(order);
    const orderName = order?.name || order?.order_number;
    const orderAmount = order?.total_price || '0.00';
    const brandName = store.brand_name || store.store_name;
    
    const data = {
      Key: store.api_key,
      Sender: store.sender,
      brand_name: store.brand_name,
      Receiver: phoneNumber,
      OrderNumber: orderName,
      OrderAmount: orderAmount,
      CustomerName: customerName,
      MsgData: `Hi, ${customerName}\nWe've received your order ${orderName} and amount Rs.${orderAmount}\nThanks for shopping at ${brandName}!\nPlease confirm your order.`,
    };
    const response = await axios.post(ORDIFY_API_URL, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    console.error('Error sending Ordify message:', error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || error.message };
  }
};