const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Template = sequelize.define(
  'Template',
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

    client_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    action: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    template_message_id: {
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

    wt_api: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    header_format: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    upload_media_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    template_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'whatsapp or voice',
    },

    buttons: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Optional buttons array - present in some templates',
    },

    download_attachment: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Optional - present in some templates',
    },
    payment_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'both',
      comment: 'post_paid, pre_paid, or both',
    },
  },
  {
    tableName: 'templates',
    timestamps: true,
    createdAt: 'dt',
    updatedAt: 'dtu',
  }
);

module.exports = Template;