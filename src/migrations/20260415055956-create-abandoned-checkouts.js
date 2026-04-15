'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('abandoned_checkouts', {
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
      shopify_checkout_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Shopify checkout ID - unique per store',
      },
      shopify_checkout_token: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Checkout token - used to verify order conversion',
      },
      customer_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      customer_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      customer_phone: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'WhatsApp number - required for sending reminders',
      },
      cart_items: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Shopify line_items array',
      },
      cart_total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: 'PKR',
      },
      abandoned_checkout_url: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Recovery URL for customer to complete checkout',
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'pending, reminded, recovered, expired',
      },
      source: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'webhook',
        comment: 'webhook or api_sync - how checkout was captured',
      },
      reminders_sent: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Count of reminders successfully sent',
      },
      last_reminder_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the last reminder was sent',
      },
      recovered_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      recovered_order_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Shopify order ID if cart was recovered',
      },
      recovered_order_total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Order total when recovered - for dashboard metrics',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Auto-calculated from store config expiry_days',
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

    await queryInterface.addConstraint('abandoned_checkouts', {
      fields: ['store_id', 'shopify_checkout_id'],
      type: 'unique',
      name: 'uq_store_checkout',
    });

    await queryInterface.addIndex('abandoned_checkouts', ['store_id', 'status']);
    await queryInterface.addIndex('abandoned_checkouts', ['customer_phone']);
    await queryInterface.addIndex('abandoned_checkouts', ['store_id', 'shopify_checkout_token']);
    await queryInterface.addIndex('abandoned_checkouts', ['expires_at']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('abandoned_checkouts');
  },
};