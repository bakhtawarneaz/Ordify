'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('campaigns', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      campaign_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      campaign_code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      target_url: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      tracking_url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      attribution_window_days: {
        type: Sequelize.INTEGER,
        defaultValue: 7,
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'active',
      },
      public_token: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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
    await queryInterface.dropTable('campaigns');
  },
};