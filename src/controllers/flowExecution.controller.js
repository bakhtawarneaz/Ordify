const flowExecutionService = require('../services/flowExecution.service');

// Webhook handler for incoming WhatsApp messages
exports.handleWebhook = async (req, reply) => {
  try {
    // WhatsApp webhook verification (GET request)
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'your_verify_token';

      if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
          console.log('Webhook verified!');
          return reply.code(200).send(challenge);
        }
      }

      return reply.code(403).send('Forbidden');
    }

    // POST request - incoming message
    const body = req.body;

    // Check if it's a WhatsApp message
    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
          if (change.field === 'messages') {
            const value = change.value;
            const messages = value.messages || [];

            for (const message of messages) {
              // Process each message
              const messageData = {
                from: message.from,
                type: message.type,
                timestamp: message.timestamp,
                message_id: message.id,
                ...message,
              };

              // Handle message asynchronously
              flowExecutionService.handleIncomingMessage(messageData)
                .then(result => {
                  console.log('Message processed:', result);
                })
                .catch(error => {
                  console.error('Message processing error:', error);
                });
            }
          }
        }
      }
    }

    // Always return 200 to WhatsApp
    return reply.code(200).send('OK');
  } catch (err) {
    console.error('Webhook Error:', err);
    return reply.code(200).send('OK'); // Still return 200 to prevent retries
  }
};

// Manually trigger a flow for a phone number
exports.triggerFlow = async (req, reply) => {
  try {
    const { flow_id, phone_number } = req.body;

    if (!flow_id || !phone_number) {
      return reply.code(400).send({
        success: false,
        message: 'flow_id and phone_number are required',
      });
    }

    const res = await flowExecutionService.startFlow(flow_id, phone_number);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

// End a session manually
exports.endSession = async (req, reply) => {
  try {
    const { session_id, status } = req.body;

    if (!session_id) {
      return reply.code(400).send({
        success: false,
        message: 'session_id is required',
      });
    }

    const res = await flowExecutionService.endSession(session_id, status || 'completed');
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

// Test endpoint - simulate incoming message
exports.simulateMessage = async (req, reply) => {
  try {
    const { phone_number, message, type } = req.body;

    if (!phone_number || !message) {
      return reply.code(400).send({
        success: false,
        message: 'phone_number and message are required',
      });
    }

    // Simulate WhatsApp message format
    const messageData = {
      from: phone_number,
      type: type || 'text',
      text: { body: message },
    };

    // If it's a button reply
    if (type === 'button_reply') {
      messageData.type = 'interactive';
      messageData.interactive = {
        type: 'button_reply',
        button_reply: {
          id: message,
          title: req.body.title || message,
        },
      };
    }

    // If it's a list reply
    if (type === 'list_reply') {
      messageData.type = 'interactive';
      messageData.interactive = {
        type: 'list_reply',
        list_reply: {
          id: message,
          title: req.body.title || message,
          description: req.body.description || '',
        },
      };
    }

    const res = await flowExecutionService.handleIncomingMessage(messageData);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};