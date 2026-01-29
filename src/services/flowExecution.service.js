const ChatbotFlow = require('../models/chatbotFlow.model');
const FlowNode = require('../models/flowNode.model');
const FlowConnection = require('../models/flowConnection.model');
const ChatbotSession = require('../models/chatbotSession.model');
const whatsapp = require('../utils/whatsapp.util');
const { replaceVariables, validateInput, replaceVariablesInObject } = require('../utils/variable.util');
const { Op } = require('sequelize');
const axios = require('axios');

// ==================== MAIN MESSAGE HANDLER ====================

/*
  Main entry point - call this when WhatsApp message received
  
  messageData = {
    from: "923001234567",
    type: "text" | "interactive" | "image" | "video" | "document" | "audio" | "location" | "contacts",
    text: { body: "user message" },
    interactive: { type: "button_reply" | "list_reply", button_reply: {...}, list_reply: {...} },
    image: { id: "...", caption: "..." },
    ...
  }
*/
exports.handleIncomingMessage = async (messageData) => {
  try {
    const phoneNumber = messageData.from;
    const messageType = messageData.type;

    // Extract message content
    const { text: messageText, inputType, interactiveData } = extractMessageContent(messageData);

    // Check for active session
    let session = await ChatbotSession.findOne({
      where: {
        phone_number: phoneNumber,
        status: { [Op.in]: ['active', 'waiting_input'] },
        is_active: true,
      },
      include: [
        { model: ChatbotFlow, as: 'flow' },
        { model: FlowNode, as: 'currentNode' },
      ],
    });

    if (session) {
      // Continue existing session
      return await continueSession(session, messageText, inputType, interactiveData);
    } else {
      // Find matching flow and start new session
      return await startNewSession(phoneNumber, messageText, inputType, interactiveData);
    }
  } catch (error) {
    console.error('Handle Incoming Message Error:', error);
    return { success: false, message: error.message };
  }
};

// Extract content from message based on type
function extractMessageContent(messageData) {
  const type = messageData.type;
  let text = '';
  let inputType = 'text';
  let interactiveData = null;

  switch (type) {
    case 'text':
      text = messageData.text?.body || '';
      inputType = 'text';
      break;

    case 'interactive':
      if (messageData.interactive?.type === 'button_reply') {
        const btnReply = messageData.interactive.button_reply;
        text = btnReply.id;
        inputType = 'button_reply';
        interactiveData = {
          button_id: btnReply.id,
          button_title: btnReply.title,
        };
      } else if (messageData.interactive?.type === 'list_reply') {
        const listReply = messageData.interactive.list_reply;
        text = listReply.id;
        inputType = 'list_reply';
        interactiveData = {
          list_id: listReply.id,
          list_title: listReply.title,
          list_description: listReply.description,
        };
      }
      break;

    case 'image':
    case 'video':
    case 'document':
    case 'audio':
      text = messageData[type]?.caption || '';
      inputType = 'media';
      interactiveData = {
        media_type: type,
        media_id: messageData[type]?.id,
      };
      break;

    case 'location':
      inputType = 'location';
      interactiveData = {
        latitude: messageData.location?.latitude,
        longitude: messageData.location?.longitude,
        name: messageData.location?.name,
        address: messageData.location?.address,
      };
      break;

    case 'contacts':
      inputType = 'contact';
      interactiveData = {
        contacts: messageData.contacts,
      };
      break;
  }

  return { text, inputType, interactiveData };
}

// ==================== SESSION MANAGEMENT ====================

async function startNewSession(phoneNumber, messageText, inputType, interactiveData) {
  // Find matching flow
  const flow = await findMatchingFlow(messageText, phoneNumber);

  if (!flow) {
    // No matching flow - optionally send default message
    return { success: false, message: 'No matching flow found' };
  }

  // Get start node
  const startNode = await FlowNode.findOne({
    where: { flow_id: flow.id, node_type: 'start', is_active: true },
  });

  if (!startNode) {
    return { success: false, message: 'Flow has no start node' };
  }

  // Create session
  const session = await ChatbotSession.create({
    flow_id: flow.id,
    phone_number: phoneNumber,
    current_node_id: startNode.id,
    session_data: {
      variables: {
        phone_number: phoneNumber,
        trigger_message: messageText,
      },
      last_input: messageText,
      last_input_type: inputType,
      api_responses: {},
    },
    status: 'active',
  });

  // Move to next node after start
  return await moveToNextNode(session, 'default');
}

async function continueSession(session, messageText, inputType, interactiveData) {
  // Update last activity
  const sessionData = session.session_data || { variables: {} };
  sessionData.last_input = messageText;
  sessionData.last_input_type = inputType;

  // Store interactive data in variables
  if (interactiveData) {
    if (inputType === 'button_reply') {
      sessionData.variables.last_button_id = interactiveData.button_id;
      sessionData.variables.last_button_title = interactiveData.button_title;
    } else if (inputType === 'list_reply') {
      sessionData.variables.last_list_id = interactiveData.list_id;
      sessionData.variables.last_list_title = interactiveData.list_title;
    }
  }

  await session.update({
    session_data: sessionData,
    last_activity_at: new Date(),
    total_messages_received: session.total_messages_received + 1,
  });

  // If waiting for input, handle it
  if (session.status === 'waiting_input') {
    return await handleUserInput(session, messageText, inputType, interactiveData);
  }

  // Otherwise continue to next node
  return await moveToNextNode(session, 'default');
}

// ==================== FLOW MATCHING ====================

async function findMatchingFlow(messageText, phoneNumber) {
  const lowerMessage = messageText.toLowerCase().trim();

  // Get all active flows
  const flows = await ChatbotFlow.findAll({
    where: { status: 'active', is_active: true },
    order: [['priority', 'DESC']],
  });

  // 1. Check keyword triggers
  for (const flow of flows) {
    if (flow.trigger_type === 'keyword' && flow.trigger_keywords?.length > 0) {
      for (const keyword of flow.trigger_keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          return flow;
        }
      }
    }
  }

  // 2. Check for welcome flow (first time user)
  const existingSession = await ChatbotSession.findOne({
    where: { phone_number: phoneNumber },
  });

  if (!existingSession) {
    const welcomeFlow = flows.find(f => f.trigger_type === 'welcome');
    if (welcomeFlow) return welcomeFlow;
  }

  // 3. Return default flow
  const defaultFlow = flows.find(f => f.trigger_type === 'default');
  return defaultFlow || null;
}

// ==================== NODE EXECUTION ====================

async function executeNode(session, node) {
  // Update current node
  await session.update({
    current_node_id: node.id,
    last_activity_at: new Date(),
  });

  const variables = session.session_data?.variables || {};

  // Execute based on node type
  switch (node.node_type) {
    case 'start':
      return await moveToNextNode(session, 'default');

    case 'send_message':
      return await executeSendMessage(session, node, variables);

    case 'send_buttons':
      return await executeSendButtons(session, node, variables);

    case 'send_list':
      return await executeSendList(session, node, variables);

    case 'send_media':
      return await executeSendMedia(session, node, variables);

    case 'ask_question':
      return await executeAskQuestion(session, node, variables);

    case 'delay':
      return await executeDelay(session, node);

    case 'condition':
      return await executeCondition(session, node, variables);

    case 'set_variable':
      return await executeSetVariable(session, node, variables);

    case 'api_call':
      return await executeApiCall(session, node, variables);

    case 'assign_agent':
      return await executeAssignAgent(session, node, variables);

    case 'add_tag':
      return await executeAddTag(session, node, variables);

    case 'remove_tag':
      return await executeRemoveTag(session, node, variables);

    case 'end':
      return await executeEnd(session, node, variables);

    default:
      return await moveToNextNode(session, 'default');
  }
}

// ==================== NODE HANDLERS ====================

async function executeSendMessage(session, node, variables) {
  const config = node.config;
  const message = replaceVariables(config.message, variables);

  // Typing delay
  if (config.typing_delay && config.typing_delay > 0) {
    await delay(config.typing_delay * 1000);
  }

  // Send message
  await whatsapp.sendTextMessage(session.phone_number, message);

  // Update messages sent count
  await session.update({ total_messages_sent: session.total_messages_sent + 1 });

  return await moveToNextNode(session, 'default');
}

async function executeSendButtons(session, node, variables) {
  const config = node.config;
  const body = replaceVariables(config.body, variables);
  const header = config.header ? replaceVariables(config.header, variables) : null;
  const footer = config.footer ? replaceVariables(config.footer, variables) : null;

  await whatsapp.sendButtonMessage(
    session.phone_number,
    body,
    config.buttons,
    header,
    footer
  );

  await session.update({
    total_messages_sent: session.total_messages_sent + 1,
    status: 'waiting_input',
    waiting_for: 'button_reply',
  });

  return { success: true, message: 'Waiting for button reply' };
}

async function executeSendList(session, node, variables) {
  const config = node.config;
  const body = replaceVariables(config.body, variables);
  const header = config.header ? replaceVariables(config.header, variables) : null;
  const footer = config.footer ? replaceVariables(config.footer, variables) : null;

  await whatsapp.sendListMessage(
    session.phone_number,
    body,
    config.button_text,
    config.sections,
    header,
    footer
  );

  await session.update({
    total_messages_sent: session.total_messages_sent + 1,
    status: 'waiting_input',
    waiting_for: 'list_reply',
  });

  return { success: true, message: 'Waiting for list reply' };
}

async function executeSendMedia(session, node, variables) {
  const config = node.config;
  const caption = config.caption ? replaceVariables(config.caption, variables) : null;
  const mediaUrl = replaceVariables(config.media_url, variables);

  await whatsapp.sendMediaMessage(
    session.phone_number,
    config.media_type,
    mediaUrl,
    caption,
    config.filename
  );

  await session.update({ total_messages_sent: session.total_messages_sent + 1 });

  return await moveToNextNode(session, 'default');
}

async function executeAskQuestion(session, node, variables) {
  const config = node.config;
  const question = replaceVariables(config.question, variables);

  await whatsapp.sendTextMessage(session.phone_number, question);

  // Store what we're waiting for
  const sessionData = session.session_data;
  sessionData.waiting_variable = config.variable_name;
  sessionData.validation = config.validation || 'none';
  sessionData.error_message = config.error_message;

  await session.update({
    total_messages_sent: session.total_messages_sent + 1,
    status: 'waiting_input',
    waiting_for: 'text',
    session_data: sessionData,
  });

  return { success: true, message: 'Waiting for text input' };
}

async function executeDelay(session, node) {
  const config = node.config;
  const seconds = config.seconds || 1;

  await delay(seconds * 1000);

  return await moveToNextNode(session, 'default');
}

async function executeCondition(session, node, variables) {
  const config = node.config;
  const variableValue = variables[config.variable];
  const compareValue = config.value;

  let result = false;

  switch (config.operator) {
    case 'equals':
      result = String(variableValue) === String(compareValue);
      break;
    case 'not_equals':
      result = String(variableValue) !== String(compareValue);
      break;
    case 'contains':
      result = String(variableValue || '').toLowerCase().includes(String(compareValue || '').toLowerCase());
      break;
    case 'not_contains':
      result = !String(variableValue || '').toLowerCase().includes(String(compareValue || '').toLowerCase());
      break;
    case 'greater_than':
      result = Number(variableValue) > Number(compareValue);
      break;
    case 'less_than':
      result = Number(variableValue) < Number(compareValue);
      break;
    case 'exists':
      result = variableValue !== undefined && variableValue !== null && variableValue !== '';
      break;
    case 'not_exists':
      result = variableValue === undefined || variableValue === null || variableValue === '';
      break;
  }

  const handle = result ? 'yes' : 'no';
  return await moveToNextNode(session, handle);
}

async function executeSetVariable(session, node, variables) {
  const config = node.config;
  const value = replaceVariables(config.value, variables);

  const sessionData = session.session_data;
  sessionData.variables[config.variable_name] = value;

  await session.update({ session_data: sessionData });

  return await moveToNextNode(session, 'default');
}

async function executeApiCall(session, node, variables) {
  const config = node.config;
  const url = replaceVariables(config.url, variables);

  try {
    const headers = replaceVariablesInObject(config.headers || {}, variables);
    const body = replaceVariablesInObject(config.body || {}, variables);

    const response = await axios({
      method: config.method,
      url: url,
      headers: headers,
      data: config.method !== 'GET' ? body : undefined,
      params: config.method === 'GET' ? body : undefined,
      timeout: 30000,
    });

    // Save response to variable
    if (config.response_variable) {
      const sessionData = session.session_data;
      sessionData.variables[config.response_variable] = response.data;
      sessionData.api_responses[config.response_variable] = {
        status: response.status,
        data: response.data,
      };
      await session.update({ session_data: sessionData });
    }

    return await moveToNextNode(session, 'success');
  } catch (error) {
    console.error('API Call Error:', error.message);

    // Try error handle
    const errorConnection = await FlowConnection.findOne({
      where: { source_node_id: node.id, source_handle: 'error', is_active: true },
    });

    if (errorConnection) {
      const errorNode = await FlowNode.findByPk(errorConnection.target_node_id);
      if (errorNode) {
        return await executeNode(session, errorNode);
      }
    }

    return await moveToNextNode(session, 'default');
  }
}

async function executeAssignAgent(session, node, variables) {
  const config = node.config;

  if (config.message) {
    const message = replaceVariables(config.message, variables);
    await whatsapp.sendTextMessage(session.phone_number, message);
    await session.update({ total_messages_sent: session.total_messages_sent + 1 });
  }

  // End session as transferred
  await session.update({
    status: 'transferred',
    completed_at: new Date(),
    is_active: false,
    waiting_for: null,
  });

  // TODO: Integrate with your agent assignment system
  // await agentService.assignToAgent(session.phone_number, config.department);

  return { success: true, message: 'Transferred to agent' };
}

async function executeAddTag(session, node, variables) {
  const config = node.config;
  const tagName = replaceVariables(config.tag_name, variables);

  // TODO: Integrate with your contact/tag system
  // await contactService.addTag(session.phone_number, tagName);

  console.log(`Add tag "${tagName}" to ${session.phone_number}`);

  return await moveToNextNode(session, 'default');
}

async function executeRemoveTag(session, node, variables) {
  const config = node.config;
  const tagName = replaceVariables(config.tag_name, variables);

  // TODO: Integrate with your contact/tag system
  // await contactService.removeTag(session.phone_number, tagName);

  console.log(`Remove tag "${tagName}" from ${session.phone_number}`);

  return await moveToNextNode(session, 'default');
}

async function executeEnd(session, node, variables) {
  const config = node.config;

  if (config.message) {
    const message = replaceVariables(config.message, variables);
    await whatsapp.sendTextMessage(session.phone_number, message);
    await session.update({ total_messages_sent: session.total_messages_sent + 1 });
  }

  // End session
  await session.update({
    status: 'completed',
    completed_at: new Date(),
    is_active: false,
    waiting_for: null,
  });

  return { success: true, message: 'Flow completed' };
}

// ==================== INPUT HANDLING ====================

async function handleUserInput(session, messageText, inputType, interactiveData) {
  const waitingFor = session.waiting_for;
  const sessionData = session.session_data;

  // Handle based on what we're waiting for
  if (waitingFor === 'text') {
    // Validate input
    const validation = sessionData.validation || 'none';
    const validationResult = validateInput(messageText, validation);

    if (!validationResult.valid) {
      // Increment retry count
      const newRetryCount = session.retry_count + 1;

      if (newRetryCount >= session.max_retries) {
        // Max retries reached - end or move to fallback
        await session.update({
          status: 'abandoned',
          completed_at: new Date(),
          is_active: false,
        });
        return { success: false, message: 'Max retries reached' };
      }

      // Send error message
      const errorMessage = sessionData.error_message || validationResult.message;
      await whatsapp.sendTextMessage(session.phone_number, errorMessage);

      await session.update({
        retry_count: newRetryCount,
        total_messages_sent: session.total_messages_sent + 1,
      });

      return { success: true, message: 'Waiting for valid input' };
    }

    // Valid input - save to variable
    const variableName = sessionData.waiting_variable;
    sessionData.variables[variableName] = messageText;

    // Clear waiting state
    delete sessionData.waiting_variable;
    delete sessionData.validation;
    delete sessionData.error_message;

    await session.update({
      status: 'active',
      waiting_for: null,
      session_data: sessionData,
      retry_count: 0,
    });

    return await moveToNextNode(session, 'default');
  }

  if (waitingFor === 'button_reply') {
    const buttonId = interactiveData?.button_id || messageText;
    return await moveToNextNode(session, buttonId);
  }

  if (waitingFor === 'list_reply') {
    const listId = interactiveData?.list_id || messageText;
    return await moveToNextNode(session, listId);
  }

  // Default - just continue
  return await moveToNextNode(session, 'default');
}

// ==================== NAVIGATION ====================

async function moveToNextNode(session, handle = 'default') {
  // Find connection from current node
  let connection = await FlowConnection.findOne({
    where: {
      source_node_id: session.current_node_id,
      source_handle: handle,
      is_active: true,
    },
  });

  // If no specific handle, try default
  if (!connection && handle !== 'default') {
    connection = await FlowConnection.findOne({
      where: {
        source_node_id: session.current_node_id,
        source_handle: 'default',
        is_active: true,
      },
    });
  }

  if (connection) {
    const nextNode = await FlowNode.findByPk(connection.target_node_id);
    if (nextNode && nextNode.is_active) {
      return await executeNode(session, nextNode);
    }
  }

  // No next node - end the flow
  await session.update({
    status: 'completed',
    completed_at: new Date(),
    is_active: false,
  });

  return { success: true, message: 'Flow completed - no more nodes' };
}

// ==================== UTILITIES ====================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== MANUAL TRIGGERS ====================

// Manually start a flow for a phone number
exports.startFlow = async (flowId, phoneNumber) => {
  const flow = await ChatbotFlow.findByPk(flowId);
  if (!flow || flow.status !== 'active') {
    return { success: false, message: 'Flow not found or not active' };
  }

  // End existing sessions
  await ChatbotSession.update(
    { status: 'abandoned', completed_at: new Date(), is_active: false },
    { where: { phone_number: phoneNumber, status: { [Op.in]: ['active', 'waiting_input'] } } }
  );

  return await startNewSession(phoneNumber, '', 'manual', null);
};

// End a session manually
exports.endSession = async (sessionId, status = 'completed') => {
  const session = await ChatbotSession.findByPk(sessionId);
  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  await session.update({
    status,
    completed_at: new Date(),
    is_active: false,
    waiting_for: null,
  });

  return { success: true, message: `Session ${status}` };
};