'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('store_settings', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      setting_key: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      setting_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: null,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('store_settings');
  },
};