const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Role = require('./role.model');
const Menu = require('./menu.model');

const RoleMenuPermission = sequelize.define(
  'RoleMenuPermission',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    role_id: {
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
    tableName: 'role_menu_permissions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['role_id', 'menu_id'], // ek role ko ek menu ki sirf ek entry
      },
    ],
  }
);

RoleMenuPermission.belongsTo(Role, {
  foreignKey: 'role_id',
  as: 'role',
});

RoleMenuPermission.belongsTo(Menu, {
  foreignKey: 'menu_id',
  as: 'menu',
});

module.exports = RoleMenuPermission;