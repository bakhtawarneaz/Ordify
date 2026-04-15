const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Store = require('./store.model');
const AbandonedCheckout = require('./abandonedCheckout.model');
const AbandonedCartReminder = require('./abandonedCartReminder.model');
const AbandonedCartTemplate = require('./abandonedCartTemplate.model');

const AbandonedCartMessageLog = sequelize.define(
  'AbandonedCartMessageLog',
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
    abandoned_checkout_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reminder_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    template_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    reminder_number: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    customer_phone: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    discount_code: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    whatsapp_message_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    whatsapp_status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'sent',
    },
    whatsapp_response: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    clicked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    clicked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    recovered: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    recovered_order_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    recovered_order_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'abandoned_cart_message_logs',
    timestamps: true,
    createdAt: 'dt',
    updatedAt: 'dtu',
  }
);

AbandonedCartMessageLog.belongsTo(Store, { foreignKey: 'store_id' });
AbandonedCartMessageLog.belongsTo(AbandonedCheckout, { foreignKey: 'abandoned_checkout_id' });
AbandonedCartMessageLog.belongsTo(AbandonedCartReminder, { foreignKey: 'reminder_id' });
AbandonedCartMessageLog.belongsTo(AbandonedCartTemplate, { foreignKey: 'template_id' });

module.exports = AbandonedCartMessageLog;