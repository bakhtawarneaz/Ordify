const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CampaignOrder = sequelize.define('CampaignOrder', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  campaign_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  store_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  shopify_order_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  order_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customer_phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  revenue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'PKR',
  },
  attribution_type: {
    type: DataTypes.STRING,
    defaultValue: 'utm',
  },
  attributed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  order_data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'campaign_orders',
  timestamps: true,
});

module.exports = CampaignOrder;