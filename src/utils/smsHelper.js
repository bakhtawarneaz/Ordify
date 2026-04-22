const axios = require('axios');

exports.sendOtpSms = async (phoneNumber, otp) => {
  try {
    if (!phoneNumber) return { success: false, message: 'Phone number is required' };
    if (!otp) return { success: false, message: 'OTP is required' };

    const params = {
      action: 'sendmessage',
      username: process.env.OTP_API_USERNAME,
      password: process.env.OTP_API_PASSWORD,
      originator: process.env.OTP_API_ORIGINATOR,
      recipient: phoneNumber,
      OtpCode: otp,
      type: process.env.OTP_TYPE || '6',
    };

    const response = await axios.get(process.env.OTP_API_URL, {
      params,
      timeout: 10000,
      responseType: 'text',
      transformResponse: [(data) => data],
    });

    let parsed;
    try {
      parsed = JSON.parse(response.data);
    } catch (parseError) {
      console.error('Failed to parse SMS response:', response.data);
      return { success: false, message: 'Invalid response from SMS gateway' };
    }

    const report = Array.isArray(parsed.data) ? parsed.data[0] : parsed.data;

    if (parsed.action === 'error' || report?.errorcode) {
      return {
        success: false,
        message: report?.errormessage || 'SMS gateway error',
        errorCode: report?.errorcode,
      };
    }

    if (report?.statuscode === '0' || report?.statuscode === 0) {
      return {
        success: true,
        message: report.statusmessage || 'OTP sent successfully',
        messageId: report.messageid,
      };
    }

    return {
      success: false,
      message: report?.statusmessage || 'Failed to send OTP',
      statusCode: report?.statuscode,
    };
  } catch (error) {
    console.error('SMS send error:', error?.response?.data || error.message);
    return {
      success: false,
      message: error?.response?.data?.message || error.message || 'Failed to send OTP',
    };
  }
};