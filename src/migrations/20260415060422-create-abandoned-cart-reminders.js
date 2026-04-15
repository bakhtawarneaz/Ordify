'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('abandoned_cart_reminders', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      abandoned_checkout_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'abandoned_checkouts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'stores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reminder_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '1, 2, or 3',
      },
      template_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'abandoned_cart_templates', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      bullmq_job_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'BullMQ job ID - needed to cancel job when cart is recovered',
      },
      discount_code: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When this reminder should be sent',
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'scheduled',
        comment: 'scheduled, processing, sent, failed, cancelled',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error details if reminder failed',
      },
      retry_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addConstraint('abandoned_cart_reminders', {
      fields: ['abandoned_checkout_id', 'reminder_number'],
      type: 'unique',
      name: 'uq_checkout_reminder_number',
    });

    await queryInterface.addIndex('abandoned_cart_reminders', ['store_id', 'status']);
    await queryInterface.addIndex('abandoned_cart_reminders', ['abandoned_checkout_id']);
    await queryInterface.addIndex('abandoned_cart_reminders', ['bullmq_job_id']);
    await queryInterface.addIndex('abandoned_cart_reminders', ['scheduled_at', 'status']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('abandoned_cart_reminders');
  },
};