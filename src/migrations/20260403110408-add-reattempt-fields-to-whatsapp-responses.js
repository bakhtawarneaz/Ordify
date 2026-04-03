'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('whatsapp_message_responses', 'reattempt_count', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    });
    await queryInterface.addColumn('whatsapp_message_responses', 'action_taken', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('whatsapp_message_responses', 'reattempt_count');
    await queryInterface.removeColumn('whatsapp_message_responses', 'action_taken');
  },
};