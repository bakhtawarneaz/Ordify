'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('abandoned_cart_message_logs', {
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
      abandoned_checkout_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'abandoned_checkouts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reminder_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'abandoned_cart_reminders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      template_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'abandoned_cart_templates', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reminder_number: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '1, 2, or 3',
      },
      customer_phone: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      discount_code: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      whatsapp_message_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Message ID returned from WhatsApp API',
      },
      whatsapp_status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'sent',
        comment: 'sent, delivered, read, failed',
      },
      whatsapp_response: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Full API response for debugging',
      },
      delivered_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      clicked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      clicked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      recovered: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      recovered_order_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      recovered_order_total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('abandoned_cart_message_logs', ['store_id']);
    await queryInterface.addIndex('abandoned_cart_message_logs', ['store_id', 'whatsapp_status']);
    await queryInterface.addIndex('abandoned_cart_message_logs', ['abandoned_checkout_id']);
    await queryInterface.addIndex('abandoned_cart_message_logs', ['whatsapp_message_id']);
    await queryInterface.addIndex('abandoned_cart_message_logs', ['store_id', 'dt']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('abandoned_cart_message_logs');
  },
};