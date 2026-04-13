'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('templates', 'tracking_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
      comment: 'Courier name(s) for tracking templates - comma separated (e.g. TCS, Leopards) or ALL for fallback',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('templates', 'tracking_name');
  },
};