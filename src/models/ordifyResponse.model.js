const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OrdifyResponse = sequelize.define(
  'OrdifyResponse',
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
    msg_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    track_link: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: 'ordify_responses',
    timestamps: true,
  }
);

module.exports = OrdifyResponse;