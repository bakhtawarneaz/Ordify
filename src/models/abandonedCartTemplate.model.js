const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AbandonedCartTemplate = sequelize.define(
  'AbandonedCartTemplate',
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
    template_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    client_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    template_message_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    wt_api: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    header_format: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    header_value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    header_sample_value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    body_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    body_text_parameters: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    buttons: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    upload_media_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'abandoned_cart_templates',
    timestamps: true,
    createdAt: 'dt',
    updatedAt: 'dtu',
  }
);


module.exports = AbandonedCartTemplate;