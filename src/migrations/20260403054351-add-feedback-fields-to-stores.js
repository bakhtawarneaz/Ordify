'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('stores', 'feedback_delay_days', {
      type: Sequelize.INTEGER,
      defaultValue: 7,
      allowNull: false,
    });
    await queryInterface.addColumn('stores', 'judge_me_api_token', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('stores', 'feedback_delay_days');
    await queryInterface.removeColumn('stores', 'judge_me_api_token');
  },
};