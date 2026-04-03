const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StoreSetting = sequelize.define(
  'StoreSetting',
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
    setting_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    setting_value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'store_settings',
    timestamps: true,
  }
);

module.exports = StoreSetting;