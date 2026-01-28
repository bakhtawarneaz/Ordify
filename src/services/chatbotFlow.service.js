const ChatbotFlow = require('../models/chatbotFlow.model');
const { Op } = require('sequelize');

// Create new flow
exports.createFlow = async (payload, userId) => {
  const { name, description, trigger_type, trigger_keywords, priority } = payload;

  const exists = await ChatbotFlow.findOne({ where: { name } });
  if (exists) {
    return { success: false, message: 'Flow with this name already exists' };
  }

  // Agar default flow bana rahe hain, check karo existing default
  if (trigger_type === 'default') {
    const defaultExists = await ChatbotFlow.findOne({
      where: { trigger_type: 'default', is_active: true },
    });
    if (defaultExists) {
      return { success: false, message: 'A default flow already exists' };
    }
  }

  const flow = await ChatbotFlow.create({
    name,
    description,
    trigger_type: trigger_type || 'keyword',
    trigger_keywords: trigger_keywords || [],
    priority: priority || 0,
    created_by: userId,
  });

  return { success: true, message: 'Flow created successfully', data: flow };
};

// Update flow
exports.updateFlow = async (id, payload) => {
  const flow = await ChatbotFlow.findByPk(id);
  if (!flow) {
    return { success: false, message: 'Flow not found' };
  }

  // Agar default set kar rahe hain
  if (payload.trigger_type === 'default' && flow.trigger_type !== 'default') {
    const defaultExists = await ChatbotFlow.findOne({
      where: { trigger_type: 'default', is_active: true, id: { [Op.ne]: id } },
    });
    if (defaultExists) {
      return { success: false, message: 'A default flow already exists' };
    }
  }

  await flow.update(payload);
  return { success: true, message: 'Flow updated successfully', data: flow };
};

// Toggle flow status (draft/active/paused)
exports.toggleFlowStatus = async ({ id, status }) => {
  const flow = await ChatbotFlow.findByPk(id);
  if (!flow) {
    return { success: false, message: 'Flow not found' };
  }

  await flow.update({ status });

  const statusMessages = {
    active: 'Flow activated successfully',
    paused: 'Flow paused successfully',
    draft: 'Flow set to draft successfully',
  };

  return { success: true, message: statusMessages[status] || 'Status updated' };
};

// Soft delete (is_active = false)
exports.deleteFlow = async (id) => {
  const flow = await ChatbotFlow.findByPk(id);
  if (!flow) {
    return { success: false, message: 'Flow not found' };
  }

  await flow.update({ is_active: false });
  return { success: true, message: 'Flow deleted successfully' };
};

// Get single flow
exports.getFlowById = async (id) => {
  const flow = await ChatbotFlow.findOne({
    where: { id, is_active: true },
  });

  if (!flow) {
    return { success: false, message: 'Flow not found' };
  }

  return { success: true, data: flow };
};

// Get all flows with filters
exports.getAllFlows = async (query = {}) => {
  const where = { is_active: true };

  if (query.status) {
    where.status = query.status;
  }

  if (query.trigger_type) {
    where.trigger_type = query.trigger_type;
  }

  if (query.search) {
    where.name = { [Op.iLike]: `%${query.search}%` };
  }

  const flows = await ChatbotFlow.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });

  return { success: true, data: flows };
};

// Duplicate flow
exports.duplicateFlow = async (id, newName) => {
  const originalFlow = await ChatbotFlow.findByPk(id);
  if (!originalFlow) {
    return { success: false, message: 'Flow not found' };
  }

  const flow = await ChatbotFlow.create({
    name: newName || `${originalFlow.name} (Copy)`,
    description: originalFlow.description,
    trigger_type: 'keyword', // Reset to keyword for duplicate
    trigger_keywords: [],
    priority: originalFlow.priority,
    status: 'draft',
    created_by: originalFlow.created_by,
  });

  return { success: true, message: 'Flow duplicated successfully', data: flow };
};