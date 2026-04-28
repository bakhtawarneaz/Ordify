'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('campaign_orders', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      campaign_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      shopify_order_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      order_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customer_phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customer_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      revenue: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0,
      },
      currency: {
        type: Sequelize.STRING,
        defaultValue: 'PKR',
      },
      attribution_type: {
        type: Sequelize.STRING,
        defaultValue: 'utm',
      },
      attributed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      order_data: {
        type: Sequelize.JSONB,
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

    await queryInterface.addIndex('campaign_orders', ['campaign_id', 'shopify_order_id'], {
      unique: true,
      name: 'unique_campaign_order',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('campaign_orders');
  },
};