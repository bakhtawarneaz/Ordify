const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define(
  'Order',
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

    order_number: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    order_data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    delivered_notified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    tracking_notified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    split_notified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    dispatch_notified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    paid_notified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'orders',
    timestamps: true,
  }
);

module.exports = Order;