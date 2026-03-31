const axios = require('axios');
const { extractPhoneFromOrder } = require('./phoneHelper');
const VOICE_API_URL = 'https://voicegateway.its.com.pk/api';

exports.sendVoiceCall = async (order, store) => {
  try {
    const supportedNumber = extractPhoneFromOrder(order);

    const requestData = {
      apikey: store.api_key,
      recipient: supportedNumber,
      campid: store.campaign_id,
      UniqueId: `${order.id},${store.store_id}`,
    };

    const response = await axios.post(VOICE_API_URL, requestData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    console.error('Error sending voice call:', error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || error.message };
  }
};