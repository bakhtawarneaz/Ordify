const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AbandonedCheckout = sequelize.define(
  'AbandonedCheckout',
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
    shopify_checkout_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    shopify_checkout_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    customer_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    customer_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    customer_phone: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    cart_items: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    cart_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'PKR',
    },
    abandoned_checkout_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'webhook',
    },
    reminders_sent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_reminder_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    recovered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    recovered_order_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    recovered_order_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'abandoned_checkouts',
    timestamps: true,
    createdAt: 'dt',
    updatedAt: 'dtu',
  }
);


module.exports = AbandonedCheckout;