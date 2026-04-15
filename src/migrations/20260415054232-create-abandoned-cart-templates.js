'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('abandoned_cart_templates', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'stores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      template_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Display name (e.g. Reminder 1 - Discount With Photo)',
      },
      client_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      template_message_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      wt_api: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      header_format: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'TEXT, IMAGE, VIDEO, DOCUMENT',
      },
      header_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      header_sample_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      body_text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      body_text_parameters: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      buttons: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      upload_media_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      dt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      dtu: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('abandoned_cart_templates', ['store_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('abandoned_cart_templates');
  },
};