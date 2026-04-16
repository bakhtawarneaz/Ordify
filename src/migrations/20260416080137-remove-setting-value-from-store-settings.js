'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('store_settings', 'setting_value');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('store_settings', 'setting_value', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
    });
  },
};