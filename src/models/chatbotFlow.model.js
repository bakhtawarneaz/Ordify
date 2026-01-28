const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChatbotFlow = sequelize.define(
  'ChatbotFlow',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    trigger_type: {
      type: DataTypes.ENUM('keyword', 'webhook', 'button_reply', 'default', 'welcome'),
      allowNull: false,
      defaultValue: 'keyword',
    },

    trigger_keywords: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },

    status: {
      type: DataTypes.ENUM('draft', 'active', 'paused'),
      defaultValue: 'draft',
    },

    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'chatbot_flows',
    timestamps: true,
  }
);

module.exports = ChatbotFlow;