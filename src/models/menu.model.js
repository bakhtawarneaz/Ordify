const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Menu = sequelize.define(
  'Menu',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    route: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    icon: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    order_no: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'menus',
    timestamps: true,
  }
);

Menu.hasMany(Menu, {
  foreignKey: 'parent_id',
  as: 'children',
});

Menu.belongsTo(Menu, {
  foreignKey: 'parent_id',
  as: 'parent',
});

module.exports = Menu;