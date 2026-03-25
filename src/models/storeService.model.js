const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StoreService = sequelize.define(
  'StoreService',
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

    service_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'order_split, order_delivered, order_paid, order_dispatch, order_tracking',
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'store_services',
    timestamps: true,
  }
);

module.exports = StoreService;