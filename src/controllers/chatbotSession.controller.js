const chatbotSessionService = require('../services/chatbotSession.service');

exports.create = async (req, reply) => {
  try {
    const res = await chatbotSessionService.createSession(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getOne = async (req, reply) => {
  try {
    const res = await chatbotSessionService.getSessionById(req.params.id);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getActiveByPhone = async (req, reply) => {
  try {
    const res = await chatbotSessionService.getActiveSession(req.params.phoneNumber);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.update = async (req, reply) => {
  try {
    const res = await chatbotSessionService.updateSession(req.params.id, req.body);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.updateCurrentNode = async (req, reply) => {
  try {
    const res = await chatbotSessionService.updateCurrentNode(req.params.id, req.body.node_id);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.setStatus = async (req, reply) => {
  try {
    const { status, waiting_for } = req.body;
    const res = await chatbotSessionService.setSessionStatus(req.params.id, status, waiting_for);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.setVariable = async (req, reply) => {
  try {
    const { key, value } = req.body;
    const res = await chatbotSessionService.setVariable(req.params.id, key, value);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.setVariables = async (req, reply) => {
  try {
    const res = await chatbotSessionService.setVariables(req.params.id, req.body.variables);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getVariable = async (req, reply) => {
  try {
    const res = await chatbotSessionService.getVariable(req.params.id, req.params.key);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getAllVariables = async (req, reply) => {
  try {
    const res = await chatbotSessionService.getAllVariables(req.params.id);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.endSession = async (req, reply) => {
  try {
    const status = req.body.status || 'completed';
    const res = await chatbotSessionService.endSession(req.params.id, status);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.endByPhone = async (req, reply) => {
  try {
    const status = req.body.status || 'completed';
    const res = await chatbotSessionService.endSessionByPhone(req.params.phoneNumber, status);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getFlowSessions = async (req, reply) => {
  try {
    const res = await chatbotSessionService.getFlowSessions(req.params.flowId, req.query);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getAll = async (req, reply) => {
  try {
    const res = await chatbotSessionService.getAllSessions(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.cleanup = async (req, reply) => {
  try {
    const timeoutMinutes = req.body.timeout_minutes || 30;
    const res = await chatbotSessionService.cleanupStaleSessions(timeoutMinutes);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getStats = async (req, reply) => {
  try {
    const { flow_id, from_date, to_date } = req.query;
    const dateRange = {};
    if (from_date) dateRange.from = from_date;
    if (to_date) dateRange.to = to_date;

    const res = await chatbotSessionService.getSessionStats(flow_id, dateRange);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};
