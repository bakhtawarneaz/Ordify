'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('voice_responses', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      order_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      phone_number: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      cdr_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
      },
      reattempt_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      action_taken: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('voice_responses');
  },
};