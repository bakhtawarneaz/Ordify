'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('orders', 'delivered_notified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
    await queryInterface.addColumn('orders', 'tracking_notified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
    await queryInterface.addColumn('orders', 'split_notified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
    await queryInterface.addColumn('orders', 'dispatch_notified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
    await queryInterface.addColumn('orders', 'paid_notified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('orders', 'delivered_notified');
    await queryInterface.removeColumn('orders', 'tracking_notified');
    await queryInterface.removeColumn('orders', 'split_notified');
    await queryInterface.removeColumn('orders', 'dispatch_notified');
    await queryInterface.removeColumn('orders', 'paid_notified');
  },
};