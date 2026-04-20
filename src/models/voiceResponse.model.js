const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const VoiceResponse = sequelize.define(
  'VoiceResponse',
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
    cdr_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    reattempt_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    action_taken: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'voice_responses',
    timestamps: true,
  }
);

module.exports = VoiceResponse;