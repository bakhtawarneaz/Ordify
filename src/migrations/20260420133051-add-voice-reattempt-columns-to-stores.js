'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('stores', 'voice_reattempt_max_count', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 3,
    });
    await queryInterface.addColumn('stores', 'voice_reattempt_delay_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 60,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('stores', 'voice_reattempt_max_count');
    await queryInterface.removeColumn('stores', 'voice_reattempt_delay_minutes');
  },
};