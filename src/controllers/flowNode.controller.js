const flowNodeService = require('../services/flowNode.service');

exports.create = async (req, reply) => {
  try {
    const res = await flowNodeService.createNode(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.update = async (req, reply) => {
  try {
    const res = await flowNodeService.updateNode(req.params.id, req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.updatePosition = async (req, reply) => {
  try {
    const res = await flowNodeService.updateNodePosition(req.params.id, req.body);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.updateConfig = async (req, reply) => {
  try {
    const res = await flowNodeService.updateNodeConfig(req.params.id, req.body);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.delete = async (req, reply) => {
  try {
    const res = await flowNodeService.deleteNode(req.params.id);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getOne = async (req, reply) => {
  try {
    const res = await flowNodeService.getNodeById(req.params.id);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getFlowNodes = async (req, reply) => {
  try {
    const res = await flowNodeService.getFlowNodes(req.params.flowId);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.bulkUpdatePositions = async (req, reply) => {
  try {
    const res = await flowNodeService.bulkUpdatePositions(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getTemplates = async (req, reply) => {
  try {
    const res = await flowNodeService.getNodeTemplates();
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};