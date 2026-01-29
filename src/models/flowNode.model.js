const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const ChatbotFlow = require('./chatbotFlow.model');

const FlowNode = sequelize.define(
  'FlowNode',
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

    node_type: {
      type: DataTypes.ENUM(
        'start',
        'send_message',
        'send_buttons',
        'send_list',
        'send_media',
        'ask_question',
        'delay',
        'condition',
        'set_variable',
        'api_call',
        'assign_agent',
        'add_tag',
        'remove_tag',
        'end'
      ),
      allowNull: false,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    position_x: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    position_y: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },

    order_no: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'flow_nodes',
    timestamps: true,
  }
);

// Associations
ChatbotFlow.hasMany(FlowNode, { foreignKey: 'flow_id', as: 'nodes', onDelete: 'CASCADE' });
FlowNode.belongsTo(ChatbotFlow, { foreignKey: 'flow_id', as: 'flow' });

module.exports = FlowNode;