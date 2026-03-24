const axios = require('axios');

const ORDIFY_API_URL = 'https://ordifyapi.its.com.pk/order';

exports.sendOrdify = async (order, store) => {
  try {
    const data = {
      Key: store.api_key,
      Sender: store.sender,
      brand_name: store.brand_name
    };

    const response = await axios.post(ORDIFY_API_URL, data, {
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  } catch (error) {
    console.error('Error sending Ordify message:', error?.response?.data || error.message);
    return { success: false, error: error?.response?.data?.message || error.message };
  }
};