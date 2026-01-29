const axios = require('axios');

/*
  WhatsApp Business API Service
  
  Environment Variables Required:
  - WHATSAPP_API_URL=https://graph.facebook.com/v17.0
  - WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
  - WHATSAPP_ACCESS_TOKEN=your_access_token
*/

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// Send text message
exports.sendTextMessage = async (to, text) => {
  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('WhatsApp Send Text Error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.error?.message || error.message };
  }
};

// Send interactive buttons
exports.sendButtonMessage = async (to, body, buttons, header = null, footer = null) => {
  try {
    const message = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.map((btn, index) => ({
            type: 'reply',
            reply: {
              id: btn.id || `btn_${index}`,
              title: btn.title.substring(0, 20), // Max 20 chars
            },
          })),
        },
      },
    };

    if (header) {
      message.interactive.header = { type: 'text', text: header };
    }

    if (footer) {
      message.interactive.footer = { text: footer };
    }

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      message,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('WhatsApp Send Buttons Error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.error?.message || error.message };
  }
};

// Send interactive list
exports.sendListMessage = async (to, body, buttonText, sections, header = null, footer = null) => {
  try {
    const message = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: body },
        action: {
          button: buttonText.substring(0, 20), // Max 20 chars
          sections: sections.map(section => ({
            title: section.title,
            rows: section.rows.map(row => ({
              id: row.id,
              title: row.title.substring(0, 24), // Max 24 chars
              description: row.description ? row.description.substring(0, 72) : undefined, // Max 72 chars
            })),
          })),
        },
      },
    };

    if (header) {
      message.interactive.header = { type: 'text', text: header };
    }

    if (footer) {
      message.interactive.footer = { text: footer };
    }

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      message,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('WhatsApp Send List Error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.error?.message || error.message };
  }
};

// Send media (image, video, document, audio)
exports.sendMediaMessage = async (to, mediaType, mediaUrl, caption = null, filename = null) => {
  try {
    const message = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: mediaType,
      [mediaType]: {
        link: mediaUrl,
      },
    };

    if (caption) {
      message[mediaType].caption = caption;
    }

    if (mediaType === 'document' && filename) {
      message[mediaType].filename = filename;
    }

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      message,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('WhatsApp Send Media Error:', error.response?.data || error.message);
    return { success: false, message: error.response?.data?.error?.message || error.message };
  }
};

// Mark message as read
exports.markAsRead = async (messageId) => {
  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('WhatsApp Mark Read Error:', error.response?.data || error.message);
    return { success: false, message: error.message };
  }
};

// Send typing indicator (not officially supported, but some use read receipts)
exports.sendTypingIndicator = async (to) => {
  // WhatsApp doesn't have official typing indicator API
  // This is a placeholder if they add it in future
  return { success: true, message: 'Typing indicator not supported' };
};