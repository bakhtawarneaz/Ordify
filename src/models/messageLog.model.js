const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MessageLog = sequelize.define(
  'MessageLog',
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

    order_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    template_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    phone_number: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'pending, sent, failed, retried',
    },

    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    max_retries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
  },
  {
    tableName: 'message_logs',
    timestamps: true,
  }
);

module.exports = MessageLog;