const ChatbotSession = require('../models/chatbotSession.model');
const ChatbotFlow = require('../models/chatbotFlow.model');
const FlowNode = require('../models/flowNode.model');
const { Op } = require('sequelize');

// Create new session
exports.createSession = async (payload) => {
  const { flow_id, phone_number, contact_id } = payload;

  // Check flow exists
  const flow = await ChatbotFlow.findByPk(flow_id);
  if (!flow) {
    return { success: false, message: 'Flow not found' };
  }

  // End any existing active sessions for this phone
  await ChatbotSession.update(
    {
      status: 'abandoned',
      completed_at: new Date(),
      is_active: false,
    },
    {
      where: {
        phone_number,
        status: { [Op.in]: ['active', 'waiting_input'] },
      },
    }
  );

  // Get start node
  const startNode = await FlowNode.findOne({
    where: { flow_id, node_type: 'start', is_active: true },
  });

  const session = await ChatbotSession.create({
    flow_id,
    phone_number,
    contact_id,
    current_node_id: startNode ? startNode.id : null,
    session_data: {
      variables: {
        phone_number,
      },
      last_input: null,
      last_input_type: null,
      api_responses: {},
    },
  });

  return { success: true, message: 'Session created', data: session };
};

// Get session by ID
exports.getSessionById = async (id) => {
  const session = await ChatbotSession.findOne({
    where: { id },
    include: [
      { model: ChatbotFlow, as: 'flow', attributes: ['id', 'name', 'status'] },
      { model: FlowNode, as: 'currentNode', attributes: ['id', 'name', 'node_type', 'config'] },
    ],
  });

  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  return { success: true, data: session };
};

// Get active session by phone number
exports.getActiveSession = async (phoneNumber) => {
  const session = await ChatbotSession.findOne({
    where: {
      phone_number: phoneNumber,
      status: { [Op.in]: ['active', 'waiting_input'] },
      is_active: true,
    },
    include: [
      { model: ChatbotFlow, as: 'flow', attributes: ['id', 'name', 'status'] },
      { model: FlowNode, as: 'currentNode', attributes: ['id', 'name', 'node_type', 'config'] },
    ],
  });

  if (!session) {
    return { success: false, message: 'No active session found' };
  }

  return { success: true, data: session };
};

// Update session
exports.updateSession = async (id, payload) => {
  const session = await ChatbotSession.findByPk(id);
  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  // Update last activity
  payload.last_activity_at = new Date();

  await session.update(payload);
  return { success: true, message: 'Session updated', data: session };
};

// Update current node
exports.updateCurrentNode = async (id, nodeId) => {
  const session = await ChatbotSession.findByPk(id);
  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  await session.update({
    current_node_id: nodeId,
    last_activity_at: new Date(),
  });

  return { success: true, message: 'Current node updated' };
};

// Set session status
exports.setSessionStatus = async (id, status, waitingFor = null) => {
  const session = await ChatbotSession.findByPk(id);
  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  const updateData = {
    status,
    last_activity_at: new Date(),
  };

  if (status === 'waiting_input' && waitingFor) {
    updateData.waiting_for = waitingFor;
  } else {
    updateData.waiting_for = null;
  }

  if (['completed', 'abandoned', 'transferred'].includes(status)) {
    updateData.completed_at = new Date();
    updateData.is_active = false;
  }

  await session.update(updateData);
  return { success: true, message: `Session ${status}` };
};

// Set session variable
exports.setVariable = async (id, key, value) => {
  const session = await ChatbotSession.findByPk(id);
  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  const sessionData = session.session_data || { variables: {} };
  sessionData.variables = sessionData.variables || {};
  sessionData.variables[key] = value;

  await session.update({
    session_data: sessionData,
    last_activity_at: new Date(),
  });

  return { success: true, message: 'Variable set', data: { [key]: value } };
};

// Set multiple variables
exports.setVariables = async (id, variables) => {
  const session = await ChatbotSession.findByPk(id);
  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  const sessionData = session.session_data || { variables: {} };
  sessionData.variables = { ...sessionData.variables, ...variables };

  await session.update({
    session_data: sessionData,
    last_activity_at: new Date(),
  });

  return { success: true, message: 'Variables set', data: sessionData.variables };
};

// Get session variable
exports.getVariable = async (id, key) => {
  const session = await ChatbotSession.findByPk(id);
  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  const value = session.session_data?.variables?.[key] || null;
  return { success: true, data: { [key]: value } };
};

// Get all session variables
exports.getAllVariables = async (id) => {
  const session = await ChatbotSession.findByPk(id);
  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  return { success: true, data: session.session_data?.variables || {} };
};

// Set last input
exports.setLastInput = async (id, input, inputType) => {
  const session = await ChatbotSession.findByPk(id);
  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  const sessionData = session.session_data || {};
  sessionData.last_input = input;
  sessionData.last_input_type = inputType;

  await session.update({
    session_data: sessionData,
    last_activity_at: new Date(),
    total_messages_received: session.total_messages_received + 1,
  });

  return { success: true, message: 'Last input set' };
};

// Increment message sent count
exports.incrementMessagesSent = async (id) => {
  const session = await ChatbotSession.findByPk(id);
  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  await session.update({
    total_messages_sent: session.total_messages_sent + 1,
    last_activity_at: new Date(),
  });

  return { success: true };
};

// Increment retry count
exports.incrementRetry = async (id) => {
  const session = await ChatbotSession.findByPk(id);
  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  const newRetryCount = session.retry_count + 1;
  const maxRetriesReached = newRetryCount >= session.max_retries;

  await session.update({
    retry_count: newRetryCount,
    last_activity_at: new Date(),
  });

  return {
    success: true,
    data: {
      retry_count: newRetryCount,
      max_retries: session.max_retries,
      max_retries_reached: maxRetriesReached,
    },
  };
};

// Reset retry count
exports.resetRetryCount = async (id) => {
  const session = await ChatbotSession.findByPk(id);
  if (!session) {
    return { success: false, message: 'Session not found' };
  }

  await session.update({ retry_count: 0 });
  return { success: true, message: 'Retry count reset' };
};

// End session
exports.endSession = async (id, status = 'completed') => {
  const session = await ChatbotSession.findByPk(id);
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

// End session by phone number
exports.endSessionByPhone = async (phoneNumber, status = 'completed') => {
  const result = await ChatbotSession.update(
    {
      status,
      completed_at: new Date(),
      is_active: false,
      waiting_for: null,
    },
    {
      where: {
        phone_number: phoneNumber,
        status: { [Op.in]: ['active', 'waiting_input'] },
      },
    }
  );

  return { success: true, message: `${result[0]} session(s) ended` };
};

// Get all sessions of a flow
exports.getFlowSessions = async (flowId, query = {}) => {
  const where = { flow_id: flowId };

  if (query.status) {
    where.status = query.status;
  }

  if (query.phone_number) {
    where.phone_number = { [Op.iLike]: `%${query.phone_number}%` };
  }

  if (query.from_date) {
    where.started_at = { [Op.gte]: new Date(query.from_date) };
  }

  if (query.to_date) {
    where.started_at = {
      ...where.started_at,
      [Op.lte]: new Date(query.to_date),
    };
  }

  const limit = parseInt(query.limit) || 50;
  const offset = parseInt(query.offset) || 0;

  const { count, rows } = await ChatbotSession.findAndCountAll({
    where,
    order: [['started_at', 'DESC']],
    limit,
    offset,
    include: [
      { model: FlowNode, as: 'currentNode', attributes: ['id', 'name', 'node_type'] },
    ],
  });

  return {
    success: true,
    data: {
      sessions: rows,
      total: count,
      limit,
      offset,
    },
  };
};

// Get all sessions (admin)
exports.getAllSessions = async (query = {}) => {
  const where = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.flow_id) {
    where.flow_id = query.flow_id;
  }

  if (query.phone_number) {
    where.phone_number = { [Op.iLike]: `%${query.phone_number}%` };
  }

  const limit = parseInt(query.limit) || 50;
  const offset = parseInt(query.offset) || 0;

  const { count, rows } = await ChatbotSession.findAndCountAll({
    where,
    order: [['started_at', 'DESC']],
    limit,
    offset,
    include: [
      { model: ChatbotFlow, as: 'flow', attributes: ['id', 'name'] },
      { model: FlowNode, as: 'currentNode', attributes: ['id', 'name', 'node_type'] },
    ],
  });

  return {
    success: true,
    data: {
      sessions: rows,
      total: count,
      limit,
      offset,
    },
  };
};

// Cleanup stale sessions (cron job ke liye)
exports.cleanupStaleSessions = async (timeoutMinutes = 30) => {
  const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  const result = await ChatbotSession.update(
    {
      status: 'abandoned',
      completed_at: new Date(),
      is_active: false,
    },
    {
      where: {
        status: { [Op.in]: ['active', 'waiting_input'] },
        last_activity_at: { [Op.lt]: cutoffTime },
      },
    }
  );

  return { success: true, message: `${result[0]} stale sessions cleaned up` };
};

// Get session stats
exports.getSessionStats = async (flowId = null, dateRange = {}) => {
  const where = {};

  if (flowId) {
    where.flow_id = flowId;
  }

  if (dateRange.from) {
    where.started_at = { [Op.gte]: new Date(dateRange.from) };
  }

  if (dateRange.to) {
    where.started_at = {
      ...where.started_at,
      [Op.lte]: new Date(dateRange.to),
    };
  }

  const total = await ChatbotSession.count({ where });
  const active = await ChatbotSession.count({ where: { ...where, status: 'active' } });
  const waitingInput = await ChatbotSession.count({ where: { ...where, status: 'waiting_input' } });
  const completed = await ChatbotSession.count({ where: { ...where, status: 'completed' } });
  const abandoned = await ChatbotSession.count({ where: { ...where, status: 'abandoned' } });
  const transferred = await ChatbotSession.count({ where: { ...where, status: 'transferred' } });

  const completionRate = total > 0 ? ((completed / total) * 100).toFixed(2) : 0;

  return {
    success: true,
    data: {
      total,
      active,
      waiting_input: waitingInput,
      completed,
      abandoned,
      transferred,
      completion_rate: parseFloat(completionRate),
    },
  };
};
