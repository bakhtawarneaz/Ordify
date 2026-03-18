const axios = require('axios');

const VOICE_API_URL = 'https://voicegateway.its.com.pk/api';

const formatPhoneNumber = (phone) => {
  const cleanedPhone = phone.replace(/^\+/, '');
  return cleanedPhone.startsWith('03') ? phone.replace(/^03/, '923') : phone;
};

exports.sendVoiceCall = async (order, store) => {
  try {
    const customerPhone = order?.billing_address?.phone || order?.customer?.phone || '';
    const supportedNumber = formatPhoneNumber(customerPhone);

    const requestData = {
      apikey: store.api_key,
      recipient: supportedNumber,
      campid: store.campaign_id,
      UniqueId: `${order.id},${store.store_id}`,
    };

    const response = await axios.post(VOICE_API_URL, requestData, {
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  } catch (error) {
    console.error('Error sending voice call:', error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || error.message };
  }
};