'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('abandoned_cart_store_configs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'stores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      is_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Master toggle - abandoned cart service ON/OFF',
      },
      expiry_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30,
        comment: 'Days after which abandoned checkout expires',
      },
      reminders: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [
          {
            reminder_number: 1,
            enabled: false,
            delay_minutes: 30,
            template_id: null,
            discount_code: null,
            product_image: 'first_in_cart',
          },
          {
            reminder_number: 2,
            enabled: false,
            delay_minutes: 180,
            template_id: null,
            discount_code: null,
            product_image: 'first_in_cart',
          },
          {
            reminder_number: 3,
            enabled: false,
            delay_minutes: 1440,
            template_id: null,
            discount_code: null,
            product_image: 'first_in_cart',
          },
        ],
        comment: 'Reminder configurations array - each with toggle, delay, template, discount, product image',
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
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('abandoned_cart_store_configs');
  },
};