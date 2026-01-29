const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const ChatbotFlow = require('./chatbotFlow.model');
const FlowNode = require('./flowNode.model');

const FlowConnection = sequelize.define(
  'FlowConnection',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    flow_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: ChatbotFlow,
        key: 'id',
      },
    },

    source_node_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: FlowNode,
        key: 'id',
      },
    },

    target_node_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: FlowNode,
        key: 'id',
      },
    },
    source_handle: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'default',
    },
    label: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'flow_connections',
    timestamps: true,
  }
);

// Associations
ChatbotFlow.hasMany(FlowConnection, { foreignKey: 'flow_id', as: 'connections', onDelete: 'CASCADE' });
FlowConnection.belongsTo(ChatbotFlow, { foreignKey: 'flow_id', as: 'flow' });

FlowConnection.belongsTo(FlowNode, { foreignKey: 'source_node_id', as: 'sourceNode' });
FlowConnection.belongsTo(FlowNode, { foreignKey: 'target_node_id', as: 'targetNode' });

FlowNode.hasMany(FlowConnection, { foreignKey: 'source_node_id', as: 'outgoingConnections' });
FlowNode.hasMany(FlowConnection, { foreignKey: 'target_node_id', as: 'incomingConnections' });

module.exports = FlowConnection;
