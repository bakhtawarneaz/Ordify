const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Store = sequelize.define(
  'Store',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    store_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    store_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    store_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    sender: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    access_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    api_key: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    brand_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    client_secret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    campaign_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    feedback_delay_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 7,
    },
    judge_me_api_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reattempt_max_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 3,
    },
    reattempt_delay_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 60,
    },
    whatsapp_trigger_tag: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'stores',
    timestamps: true,
  }
);

module.exports = Store;