const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const ChatbotFlow = require('./chatbotFlow.model');
const FlowNode = require('./flowNode.model');

const ChatbotSession = sequelize.define(
  'ChatbotSession',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    flow_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: ChatbotFlow,
        key: 'id',
      },
    },

    // Contact reference (agar aapke paas contact table hai)
    contact_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    // WhatsApp phone number
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },

    // Current node where user is
    current_node_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: FlowNode,
        key: 'id',
      },
    },
    session_data: {
      type: DataTypes.JSONB,
      defaultValue: {
        variables: {},
        last_input: null,
        last_input_type: null,
        api_responses: {},
      },
    },

    status: {
      type: DataTypes.ENUM(
        'active',           // Flow chal raha hai
        'waiting_input',    // User ka response wait kar rahe hain
        'completed',        // Flow complete ho gaya
        'abandoned',        // User ne chor diya / timeout
        'transferred'       // Agent ko transfer ho gaya
      ),
      defaultValue: 'active',
    },

    // What are we waiting for (when status is waiting_input)
    waiting_for: {
      type: DataTypes.ENUM(
        'text',            // Free text input
        'button_reply',    // Button click
        'list_reply',      // List item selection
        'media',           // Image/video/document
        'location',        // Location share
        'contact'          // Contact share
      ),
      allowNull: true,
    },

    // Retry count for invalid inputs
    retry_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    // Max retries allowed
    max_retries: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
    },

    // Session timeout in minutes
    timeout_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
    },

    started_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    last_activity_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // For analytics
    total_messages_sent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    total_messages_received: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'chatbot_sessions',
    timestamps: true,
    indexes: [
      { fields: ['phone_number', 'status'] },
      { fields: ['flow_id', 'status'] },
      { fields: ['status', 'last_activity_at'] },
    ],
  }
);

// Associations
ChatbotFlow.hasMany(ChatbotSession, { foreignKey: 'flow_id', as: 'sessions' });
ChatbotSession.belongsTo(ChatbotFlow, { foreignKey: 'flow_id', as: 'flow' });

ChatbotSession.belongsTo(FlowNode, { foreignKey: 'current_node_id', as: 'currentNode' });

module.exports = ChatbotSession;
