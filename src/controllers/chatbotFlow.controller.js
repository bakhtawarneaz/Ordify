const chatbotFlowService = require('../services/chatbotFlow.service');

exports.create = async (req, reply) => {
  try {
    const res = await chatbotFlowService.createFlow(req.body, req.user.id);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.update = async (req, reply) => {
  try {
    const res = await chatbotFlowService.updateFlow(req.params.id, req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.toggleStatus = async (req, reply) => {
  try {
    const res = await chatbotFlowService.toggleFlowStatus(req.body);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.delete = async (req, reply) => {
  try {
    const res = await chatbotFlowService.deleteFlow(req.params.id);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getOne = async (req, reply) => {
  try {
    const res = await chatbotFlowService.getFlowById(req.params.id);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getAll = async (req, reply) => {
  try {
    const res = await chatbotFlowService.getAllFlows(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.duplicate = async (req, reply) => {
  try {
    const res = await chatbotFlowService.duplicateFlow(req.params.id, req.body.name);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};