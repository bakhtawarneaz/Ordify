const FlowNode = require('../models/flowNode.model');
const ChatbotFlow = require('../models/chatbotFlow.model');
const { Op } = require('sequelize');

// Create node
exports.createNode = async (payload) => {
  const { flow_id, node_type, name, position_x, position_y, config } = payload;

  // Check flow exists
  const flow = await ChatbotFlow.findByPk(flow_id);
  if (!flow) {
    return { success: false, message: 'Flow not found' };
  }

  // Start node sirf ek hona chahiye
  if (node_type === 'start') {
    const existingStart = await FlowNode.findOne({
      where: { flow_id, node_type: 'start', is_active: true },
    });
    if (existingStart) {
      return { success: false, message: 'Flow already has a start node' };
    }
  }

  // Get next order number
  const maxOrder = await FlowNode.max('order_no', { where: { flow_id } });

  const node = await FlowNode.create({
    flow_id,
    node_type,
    name: name || `${node_type} node`,
    position_x: position_x || 0,
    position_y: position_y || 0,
    config: config || {},
    order_no: (maxOrder || 0) + 1,
  });

  return { success: true, message: 'Node created successfully', data: node };
};

// Update node
exports.updateNode = async (id, payload) => {
  const node = await FlowNode.findByPk(id);
  if (!node) {
    return { success: false, message: 'Node not found' };
  }

  // Node type change not allowed
  if (payload.node_type && payload.node_type !== node.node_type) {
    return { success: false, message: 'Cannot change node type' };
  }

  await node.update(payload);
  return { success: true, message: 'Node updated successfully', data: node };
};

// Update node position (for drag & drop)
exports.updateNodePosition = async (id, payload) => {
  const { position_x, position_y } = payload;

  const node = await FlowNode.findByPk(id);
  if (!node) {
    return { success: false, message: 'Node not found' };
  }

  await node.update({ position_x, position_y });
  return { success: true, message: 'Position updated' };
};

// Update node config only
exports.updateNodeConfig = async (id, config) => {
  const node = await FlowNode.findByPk(id);
  if (!node) {
    return { success: false, message: 'Node not found' };
  }

  // Merge with existing config
  const newConfig = { ...node.config, ...config };
  await node.update({ config: newConfig });

  return { success: true, message: 'Config updated', data: node };
};

// Delete node
exports.deleteNode = async (id) => {
  const node = await FlowNode.findByPk(id);
  if (!node) {
    return { success: false, message: 'Node not found' };
  }

  // Start node delete nahi ho sakta
  if (node.node_type === 'start') {
    return { success: false, message: 'Cannot delete start node' };
  }

  await node.update({ is_active: false });
  return { success: true, message: 'Node deleted successfully' };
};

// Get single node
exports.getNodeById = async (id) => {
  const node = await FlowNode.findOne({
    where: { id, is_active: true },
  });

  if (!node) {
    return { success: false, message: 'Node not found' };
  }

  return { success: true, data: node };
};

// Get all nodes of a flow
exports.getFlowNodes = async (flowId) => {
  const flow = await ChatbotFlow.findByPk(flowId);
  if (!flow) {
    return { success: false, message: 'Flow not found' };
  }

  const nodes = await FlowNode.findAll({
    where: { flow_id: flowId, is_active: true },
    order: [['order_no', 'ASC']],
  });

  return { success: true, data: nodes };
};

// Bulk update positions (for saving entire canvas)
exports.bulkUpdatePositions = async (payload) => {
  const { flow_id, positions } = payload;
  // positions = [{ id: "uuid", position_x: 100, position_y: 200 }, ...]

  const flow = await ChatbotFlow.findByPk(flow_id);
  if (!flow) {
    return { success: false, message: 'Flow not found' };
  }

  for (const pos of positions) {
    await FlowNode.update(
      { position_x: pos.position_x, position_y: pos.position_y },
      { where: { id: pos.id, flow_id } }
    );
  }

  return { success: true, message: 'Positions updated successfully' };
};

// Get node templates (for frontend dropdown)
exports.getNodeTemplates = async () => {
  const templates = [
    {
      type: 'send_message',
      name: 'Send Message',
      icon: 'message-square',
      description: 'Send a text message',
      config_schema: {
        message: { type: 'textarea', label: 'Message', required: true, placeholder: 'Enter message...' },
        typing_delay: { type: 'number', label: 'Typing Delay (seconds)', default: 0 },
      },
    },
    {
      type: 'send_buttons',
      name: 'Send Buttons',
      icon: 'grid',
      description: 'Send interactive buttons (max 3)',
      config_schema: {
        header: { type: 'text', label: 'Header (optional)' },
        body: { type: 'textarea', label: 'Body Text', required: true },
        footer: { type: 'text', label: 'Footer (optional)' },
        buttons: {
          type: 'array',
          label: 'Buttons',
          max: 3,
          item: { id: { type: 'text', label: 'Button ID' }, title: { type: 'text', label: 'Button Title', maxLength: 20 } },
        },
      },
    },
    {
      type: 'send_list',
      name: 'Send List',
      icon: 'list',
      description: 'Send a list menu (max 10 items)',
      config_schema: {
        header: { type: 'text', label: 'Header (optional)' },
        body: { type: 'textarea', label: 'Body Text', required: true },
        footer: { type: 'text', label: 'Footer (optional)' },
        button_text: { type: 'text', label: 'Button Text', required: true, maxLength: 20 },
        sections: {
          type: 'array',
          label: 'Sections',
          item: {
            title: { type: 'text', label: 'Section Title' },
            rows: {
              type: 'array',
              label: 'Items',
              item: {
                id: { type: 'text', label: 'Item ID' },
                title: { type: 'text', label: 'Title', maxLength: 24 },
                description: { type: 'text', label: 'Description', maxLength: 72 },
              },
            },
          },
        },
      },
    },
    {
      type: 'send_media',
      name: 'Send Media',
      icon: 'image',
      description: 'Send image, video, document or audio',
      config_schema: {
        media_type: { type: 'select', label: 'Media Type', options: ['image', 'video', 'document', 'audio'], required: true },
        media_url: { type: 'text', label: 'Media URL', required: true },
        caption: { type: 'textarea', label: 'Caption (optional)' },
        filename: { type: 'text', label: 'Filename (for documents)' },
      },
    },
    {
      type: 'ask_question',
      name: 'Ask Question',
      icon: 'help-circle',
      description: 'Ask user a question and save response',
      config_schema: {
        question: { type: 'textarea', label: 'Question', required: true },
        variable_name: { type: 'text', label: 'Save to Variable', required: true },
        validation: { type: 'select', label: 'Validation', options: ['none', 'text', 'email', 'phone', 'number'], default: 'none' },
        error_message: { type: 'text', label: 'Error Message (invalid input)' },
      },
    },
    {
      type: 'delay',
      name: 'Delay',
      icon: 'clock',
      description: 'Wait before next step',
      config_schema: {
        seconds: { type: 'number', label: 'Wait Seconds', required: true, min: 1, max: 300 },
      },
    },
    {
      type: 'condition',
      name: 'Condition',
      icon: 'git-branch',
      description: 'Branch based on condition',
      config_schema: {
        variable: { type: 'text', label: 'Variable Name', required: true },
        operator: { type: 'select', label: 'Operator', options: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'exists', 'not_exists'], required: true },
        value: { type: 'text', label: 'Compare Value' },
      },
    },
    {
      type: 'set_variable',
      name: 'Set Variable',
      icon: 'database',
      description: 'Set a variable value',
      config_schema: {
        variable_name: { type: 'text', label: 'Variable Name', required: true },
        value: { type: 'text', label: 'Value', required: true },
      },
    },
    {
      type: 'api_call',
      name: 'API Call',
      icon: 'globe',
      description: 'Make HTTP request',
      config_schema: {
        url: { type: 'text', label: 'URL', required: true },
        method: { type: 'select', label: 'Method', options: ['GET', 'POST', 'PUT', 'DELETE'], required: true },
        headers: { type: 'json', label: 'Headers (JSON)' },
        body: { type: 'json', label: 'Body (JSON)' },
        response_variable: { type: 'text', label: 'Save Response To' },
      },
    },
    {
      type: 'assign_agent',
      name: 'Assign Agent',
      icon: 'user',
      description: 'Transfer to human agent',
      config_schema: {
        department: { type: 'text', label: 'Department (optional)' },
        message: { type: 'textarea', label: 'Transfer Message' },
      },
    },
    {
      type: 'add_tag',
      name: 'Add Tag',
      icon: 'tag',
      description: 'Add tag to contact',
      config_schema: {
        tag_name: { type: 'text', label: 'Tag Name', required: true },
      },
    },
    {
      type: 'remove_tag',
      name: 'Remove Tag',
      icon: 'x-circle',
      description: 'Remove tag from contact',
      config_schema: {
        tag_name: { type: 'text', label: 'Tag Name', required: true },
      },
    },
    {
      type: 'end',
      name: 'End Flow',
      icon: 'stop-circle',
      description: 'End the conversation',
      config_schema: {
        message: { type: 'textarea', label: 'Final Message (optional)' },
      },
    },
  ];

  return { success: true, data: templates };
};