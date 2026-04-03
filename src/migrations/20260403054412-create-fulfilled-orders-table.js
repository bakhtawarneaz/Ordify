'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('fulfilled_orders', {
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
        type: Sequelize.STRING,
        allowNull: false,
      },
      order_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customer_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customer_phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customer_email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      product_ids: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      product_names: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      order_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      fulfilled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      send_feedback_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      feedback_sent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      feedback_received: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      message_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      review_text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('fulfilled_orders');
  },
};