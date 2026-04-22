const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ForgotPasswordOtp = sequelize.define(
  'ForgotPasswordOtp',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Hashed OTP (sha256)',
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    reset_token: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Issued after OTP verification, used for password reset',
    },
    reset_token_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Failed OTP verification attempts',
    },
  },
  {
    tableName: 'forgot_password_otps',
    timestamps: true,
    indexes: [
      { fields: ['email'] },
      { fields: ['reset_token'] },
    ],
  }
);

module.exports = ForgotPasswordOtp;