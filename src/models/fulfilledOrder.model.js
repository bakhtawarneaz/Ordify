const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FulfilledOrder = sequelize.define(
  'FulfilledOrder',
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
      type: DataTypes.STRING,
      allowNull: false,
    },
    order_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customer_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customer_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customer_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    product_ids: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    product_names: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    order_data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    fulfilled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    send_feedback_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    feedback_sent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    feedback_received: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    message_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    review_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'fulfilled_orders',
    timestamps: true,
  }
);

module.exports = FulfilledOrder;