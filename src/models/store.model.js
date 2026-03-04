const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const store = sequelize.define('store', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  store_id: { type: DataTypes.STRING, allowNull: false },
  store_name: { type: DataTypes.STRING, allowNull: false },
  sender: { type: DataTypes.STRING, allowNull: false },
  access_token: { type: DataTypes.STRING, allowNull: false },
  api_key: { type: DataTypes.STRING, allowNull: false },
  brand_name: { type: DataTypes.STRING, allowNull: false },

  status: { type: DataTypes.BOOLEAN, defaultValue: true },
  whatsapp_only: { type: DataTypes.BOOLEAN, defaultValue: false },
  voice_only: { type: DataTypes.BOOLEAN, defaultValue: false },
  ordify_only: { type: DataTypes.BOOLEAN, defaultValue: false },
  judgeme_api_token: { type: DataTypes.STRING, allowNull: false },
  voice_unanswered: { type: DataTypes.BOOLEAN, defaultValue: false },
  feedback_delay: { type: DataTypes.INTEGER,   defaultValue: 1},
  voice_unanswered_whatsapp:  { type: DataTypes.BOOLEAN, defaultValue: false },
  post_paid: { type: DataTypes.BOOLEAN, defaultValue: false },
  pre_paid: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'stores',
  timestamps: true,
});

// User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

module.exports = store;
