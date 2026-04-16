'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('stores', 'whatsapp_only');
    await queryInterface.removeColumn('stores', 'voice_only');
    await queryInterface.removeColumn('stores', 'ordify_only');
    await queryInterface.removeColumn('stores', 'post_paid');
    await queryInterface.removeColumn('stores', 'pre_paid');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('stores', 'whatsapp_only', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('stores', 'voice_only', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('stores', 'ordify_only', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('stores', 'post_paid', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('stores', 'pre_paid', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
  },
};