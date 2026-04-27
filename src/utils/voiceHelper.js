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
    const data = response.data;

    if (data.ErrorCode || data.errorCode) {
      return {
        success: false,
        error: data.ErrorMessage || data.errorMessage || 'Unknown API error',
        errorCode: data.ErrorCode || data.errorCode,
      };
    }
    return { success: true, response: data };
  } catch (error) {
    const apiError = error.response?.data || {};
    return {
      success: false,
      error: apiError.ErrorMessage || apiError.message || error.message,
      errorCode: apiError.ErrorCode || error.response?.status,
    };
  }
};