const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Role = require('./role.model');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  number: { type: DataTypes.STRING, allowNull: true,},
  image: { type: DataTypes.STRING, allowNull: true, },
  role_id: { type: DataTypes.INTEGER, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'users',
  timestamps: true,
});

User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

module.exports = User;
