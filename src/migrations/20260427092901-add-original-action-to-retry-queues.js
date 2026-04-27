'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('retry_queues', 'original_action', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'whatsapp_sent',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('retry_queues', 'original_action');
  },
};