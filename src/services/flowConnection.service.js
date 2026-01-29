const FlowConnection = require('../models/flowConnection.model');
const FlowNode = require('../models/flowNode.model');
const ChatbotFlow = require('../models/chatbotFlow.model');
const { Op } = require('sequelize');

// Create connection
exports.createConnection = async (payload) => {
  const { flow_id, source_node_id, target_node_id, source_handle, label } = payload;

  // Check flow exists
  const flow = await ChatbotFlow.findByPk(flow_id);
  if (!flow) {
    return { success: false, message: 'Flow not found' };
  }

  // Check source node exists and belongs to this flow
  const sourceNode = await FlowNode.findOne({
    where: { id: source_node_id, flow_id, is_active: true },
  });
  if (!sourceNode) {
    return { success: false, message: 'Source node not found' };
  }

  // Check target node exists and belongs to this flow
  const targetNode = await FlowNode.findOne({
    where: { id: target_node_id, flow_id, is_active: true },
  });
  if (!targetNode) {
    return { success: false, message: 'Target node not found' };
  }

  // Prevent self-loop
  if (source_node_id === target_node_id) {
    return { success: false, message: 'Cannot connect node to itself' };
  }

  // Check duplicate connection with same handle
  const existingConn = await FlowConnection.findOne({
    where: {
      flow_id,
      source_node_id,
      source_handle: source_handle || 'default',
      is_active: true,
    },
  });
  if (existingConn) {
    return { success: false, message: 'Connection with this handle already exists' };
  }

  const connection = await FlowConnection.create({
    flow_id,
    source_node_id,
    target_node_id,
    source_handle: source_handle || 'default',
    label,
  });

  return { success: true, message: 'Connection created successfully', data: connection };
};

// Update connection
exports.updateConnection = async (id, payload) => {
  const connection = await FlowConnection.findByPk(id);
  if (!connection) {
    return { success: false, message: 'Connection not found' };
  }

  // If changing target, validate it
  if (payload.target_node_id && payload.target_node_id !== connection.target_node_id) {
    const targetNode = await FlowNode.findOne({
      where: { id: payload.target_node_id, flow_id: connection.flow_id, is_active: true },
    });
    if (!targetNode) {
      return { success: false, message: 'Target node not found' };
    }

    // Prevent self-loop
    if (connection.source_node_id === payload.target_node_id) {
      return { success: false, message: 'Cannot connect node to itself' };
    }
  }

  await connection.update(payload);
  return { success: true, message: 'Connection updated successfully', data: connection };
};

// Delete connection
exports.deleteConnection = async (id) => {
  const connection = await FlowConnection.findByPk(id);
  if (!connection) {
    return { success: false, message: 'Connection not found' };
  }

  await connection.update({ is_active: false });
  return { success: true, message: 'Connection deleted successfully' };
};

// Hard delete connection (permanent)
exports.hardDeleteConnection = async (id) => {
  const connection = await FlowConnection.findByPk(id);
  if (!connection) {
    return { success: false, message: 'Connection not found' };
  }

  await connection.destroy();
  return { success: true, message: 'Connection permanently deleted' };
};

// Get single connection
exports.getConnectionById = async (id) => {
  const connection = await FlowConnection.findOne({
    where: { id, is_active: true },
    include: [
      { model: FlowNode, as: 'sourceNode', attributes: ['id', 'name', 'node_type'] },
      { model: FlowNode, as: 'targetNode', attributes: ['id', 'name', 'node_type'] },
    ],
  });

  if (!connection) {
    return { success: false, message: 'Connection not found' };
  }

  return { success: true, data: connection };
};

// Get all connections of a flow
exports.getFlowConnections = async (flowId) => {
  const flow = await ChatbotFlow.findByPk(flowId);
  if (!flow) {
    return { success: false, message: 'Flow not found' };
  }

  const connections = await FlowConnection.findAll({
    where: { flow_id: flowId, is_active: true },
    include: [
      { model: FlowNode, as: 'sourceNode', attributes: ['id', 'name', 'node_type'] },
      { model: FlowNode, as: 'targetNode', attributes: ['id', 'name', 'node_type'] },
    ],
  });

  return { success: true, data: connections };
};

// Get outgoing connections from a node
exports.getNodeOutgoingConnections = async (nodeId) => {
  const node = await FlowNode.findByPk(nodeId);
  if (!node) {
    return { success: false, message: 'Node not found' };
  }

  const connections = await FlowConnection.findAll({
    where: { source_node_id: nodeId, is_active: true },
    include: [
      { model: FlowNode, as: 'targetNode', attributes: ['id', 'name', 'node_type'] },
    ],
  });

  return { success: true, data: connections };
};

// Get incoming connections to a node
exports.getNodeIncomingConnections = async (nodeId) => {
  const node = await FlowNode.findByPk(nodeId);
  if (!node) {
    return { success: false, message: 'Node not found' };
  }

  const connections = await FlowConnection.findAll({
    where: { target_node_id: nodeId, is_active: true },
    include: [
      { model: FlowNode, as: 'sourceNode', attributes: ['id', 'name', 'node_type'] },
    ],
  });

  return { success: true, data: connections };
};

// Bulk create connections (for saving entire flow)
exports.bulkCreateConnections = async (payload) => {
  const { flow_id, connections } = payload;

  const flow = await ChatbotFlow.findByPk(flow_id);
  if (!flow) {
    return { success: false, message: 'Flow not found' };
  }

  const createdConnections = [];
  const errors = [];

  for (const conn of connections) {
    // Validate nodes
    const sourceNode = await FlowNode.findOne({
      where: { id: conn.source_node_id, flow_id, is_active: true },
    });
    const targetNode = await FlowNode.findOne({
      where: { id: conn.target_node_id, flow_id, is_active: true },
    });

    if (!sourceNode || !targetNode) {
      errors.push(`Invalid nodes in connection: ${conn.source_node_id} -> ${conn.target_node_id}`);
      continue;
    }

    if (conn.source_node_id === conn.target_node_id) {
      errors.push(`Self-loop not allowed: ${conn.source_node_id}`);
      continue;
    }

    const newConn = await FlowConnection.create({
      flow_id,
      source_node_id: conn.source_node_id,
      target_node_id: conn.target_node_id,
      source_handle: conn.source_handle || 'default',
      label: conn.label,
    });

    createdConnections.push(newConn);
  }

  return {
    success: true,
    message: `${createdConnections.length} connections created`,
    data: createdConnections,
    errors: errors.length > 0 ? errors : undefined,
  };
};

// Delete all connections of a flow (for rebuilding)
exports.deleteFlowConnections = async (flowId) => {
  const flow = await ChatbotFlow.findByPk(flowId);
  if (!flow) {
    return { success: false, message: 'Flow not found' };
  }

  await FlowConnection.update(
    { is_active: false },
    { where: { flow_id: flowId } }
  );

  return { success: true, message: 'All connections deleted' };
};

// Replace all connections (delete old + create new)
exports.replaceFlowConnections = async (payload) => {
  const { flow_id, connections } = payload;

  const flow = await ChatbotFlow.findByPk(flow_id);
  if (!flow) {
    return { success: false, message: 'Flow not found' };
  }

  // Delete existing connections (hard delete for clean slate)
  await FlowConnection.destroy({ where: { flow_id } });

  // Create new connections
  const createdConnections = [];
  const errors = [];

  for (const conn of connections) {
    const sourceNode = await FlowNode.findOne({
      where: { id: conn.source_node_id, flow_id, is_active: true },
    });
    const targetNode = await FlowNode.findOne({
      where: { id: conn.target_node_id, flow_id, is_active: true },
    });

    if (!sourceNode || !targetNode) {
      errors.push(`Invalid nodes: ${conn.source_node_id} -> ${conn.target_node_id}`);
      continue;
    }

    if (conn.source_node_id === conn.target_node_id) {
      errors.push(`Self-loop not allowed: ${conn.source_node_id}`);
      continue;
    }

    const newConn = await FlowConnection.create({
      flow_id,
      source_node_id: conn.source_node_id,
      target_node_id: conn.target_node_id,
      source_handle: conn.source_handle || 'default',
      label: conn.label,
    });

    createdConnections.push(newConn);
  }

  return {
    success: true,
    message: `${createdConnections.length} connections saved`,
    data: createdConnections,
    errors: errors.length > 0 ? errors : undefined,
  };
};
