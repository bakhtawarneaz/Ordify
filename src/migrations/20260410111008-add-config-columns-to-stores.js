'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('stores', 'feedback_delay_days', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 7,
    });
    await queryInterface.addColumn('stores', 'judge_me_api_token', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn('stores', 'reattempt_max_count', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 3,
    });
    await queryInterface.addColumn('stores', 'reattempt_delay_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 60,
    });
    await queryInterface.addColumn('stores', 'whatsapp_trigger_tag', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('stores', 'feedback_delay_days');
    await queryInterface.removeColumn('stores', 'judge_me_api_token');
    await queryInterface.removeColumn('stores', 'reattempt_max_count');
    await queryInterface.removeColumn('stores', 'reattempt_delay_minutes');
    await queryInterface.removeColumn('stores', 'whatsapp_trigger_tag');
  },
};