const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ActivityLog = sequelize.define(
  'ActivityLog',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    store_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    store_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    order_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    order_number: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    channel: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'whatsapp, voice, ordify, system',
    },

    action: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'whatsapp_sent, tag_added, voice_call_sent, retry_attempted, etc.',
    },

    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'success, failed',
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    details: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Extra details like phone, messageId, tag name, error etc.',
    },
  },
  {
    tableName: 'activity_logs',
    timestamps: true,
  }
);

module.exports = ActivityLog;