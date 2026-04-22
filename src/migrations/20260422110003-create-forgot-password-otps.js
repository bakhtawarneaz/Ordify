'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('forgot_password_otps', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      otp: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Hashed OTP (sha256)',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      reset_token: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Issued after OTP verification, used for password reset',
      },
      reset_token_expires: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Failed OTP verification attempts',
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

    // Add indexes for faster lookups
    await queryInterface.addIndex('forgot_password_otps', ['email']);
    await queryInterface.addIndex('forgot_password_otps', ['reset_token']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('forgot_password_otps');
  },
};