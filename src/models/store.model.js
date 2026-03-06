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
      type: DataTypes.INTEGER,
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

    whatsapp_only: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    voice_only: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    ordify_only: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    brand_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    post_paid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    pre_paid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    judgeme_api_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    feedback_delay: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    voice_unanswered_whatsapp: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    voice_unanswered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    campaign_id: {
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