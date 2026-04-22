const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AbandonedCartStoreConfig = sequelize.define(
  'AbandonedCartStoreConfig',
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
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    expiry_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    reminders: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [
        { reminder_number: 1, enabled: false, delay_minutes: 30, template_id: null, discount_code: null, product_image: 'first_in_cart' },
        { reminder_number: 2, enabled: false, delay_minutes: 180, template_id: null, discount_code: null, product_image: 'first_in_cart' },
        { reminder_number: 3, enabled: false, delay_minutes: 1440, template_id: null, discount_code: null, product_image: 'first_in_cart' },
      ],
    },
  },
  {
    tableName: 'abandoned_cart_store_configs',
    timestamps: true,
    createdAt: 'dt',
    updatedAt: 'dtu',
  }
);


module.exports = AbandonedCartStoreConfig;