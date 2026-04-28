const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Campaign = sequelize.define('Campaign', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  store_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  campaign_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  campaign_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  target_url: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  tracking_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  attribution_window_days: {
    type: DataTypes.INTEGER,
    defaultValue: 7,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active',
  },
  public_token: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'campaigns',
  timestamps: true,
});

module.exports = Campaign;