const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WhatsAppMessageResponse = sequelize.define(
  'WhatsAppMessageResponse',
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

    phone_number: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    message_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: 'whatsapp_message_responses',
    timestamps: true,
  }
);

module.exports = WhatsAppMessageResponse;