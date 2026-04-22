const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AbandonedCartReminder = sequelize.define(
  'AbandonedCartReminder',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    abandoned_checkout_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reminder_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    template_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bullmq_job_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    discount_code: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'scheduled',
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
  },
  {
    tableName: 'abandoned_cart_reminders',
    timestamps: true,
    createdAt: 'dt',
    updatedAt: 'dtu',
  }
);

module.exports = AbandonedCartReminder;