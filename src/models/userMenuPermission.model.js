const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');
const Menu = require('./menu.model');

const UserMenuPermission = sequelize.define(
  'UserMenuPermission',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    menu_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    can_view: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    can_create: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    can_edit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    can_delete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'user_menu_permissions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'menu_id'],
      },
    ],
  }
);

UserMenuPermission.belongsTo(User, { foreignKey: 'user_id' });
UserMenuPermission.belongsTo(Menu, { foreignKey: 'menu_id' });

module.exports = UserMenuPermission;