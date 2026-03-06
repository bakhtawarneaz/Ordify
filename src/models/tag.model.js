const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Tag = sequelize.define(
  'Tag',
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

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'tags',
    timestamps: true,
  }
);

module.exports = Tag;