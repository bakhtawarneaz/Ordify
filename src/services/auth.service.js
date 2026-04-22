const User = require('../models/user.model');
const Role = require('../models/role.model');
const ForgotPasswordOtp = require('../models/forgotPasswordOtp.model');
const { Op } = require('sequelize');
const { hashPassword, comparePassword } = require('../utils/bcrypt');
const { generateToken } = require('../utils/jwt');
const { generateOtp, hashOtp, generateResetToken } = require('../utils/otpHelper'); 
const { sendOtpSms } = require('../utils/smsHelper');

exports.register = async ({ name, email, password, role_id, number, image }) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return { success: false, message: 'Email already exists' };
  }

  const role = await Role.findByPk(role_id);
  if (!role) {
    return { success: false, message: 'Invalid role' };
  }

  const clientRole = await Role.findOne({ 
    where: { name: { [Op.iLike]: 'client' } } 
  });
  
  if (!clientRole) {
    return { success: false, message: 'Client role not found' };
  }

  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role_id: clientRole.id,
    number,
    image,
  });

  const safeUser = user.toJSON();
  delete safeUser.password;

  return {
    success: true,
    message: 'User registered successfully',
    data: safeUser,
  };
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({
    where: { email },
    include: { model: Role, as: 'role' },
  });

  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (!user.is_active) {
    return { success: false, message: 'Account is disabled' };
  }

  const match = await comparePassword(password, user.password);
  if (!match) {
    return { success: false, message: 'Invalid credentials' };
  }

  const token = generateToken(user);

  const safeUser = user.toJSON();
  delete safeUser.password;

  return {
    success: true,
    message: 'Login successful',
    data: { token, user: safeUser },
  };
};

exports.sendForgotPasswordOtp = async ({ email }) => {
  if (!email) {
    return { success: false, message: 'Email is required' };
  }

  const user = await User.findOne({ where: { email } });

  if (!user) {
    return { success: false, message: 'Email not found' };
  }

  if (!user.is_active) {
    return { success: false, message: 'Account is disabled' };
  }

  if (!user.number) {
    return { success: false, message: 'No phone number linked to this account. Please contact support.' };
  }

  const recentOtp = await ForgotPasswordOtp.findOne({
    where: {
      email,
      createdAt: { [Op.gt]: new Date(Date.now() - 60 * 1000) },
    },
    order: [['createdAt', 'DESC']],
  });

  if (recentOtp) {
    return {
      success: false,
      message: 'Please wait at least 1 minute before requesting another OTP',
    };
  }

  await ForgotPasswordOtp.destroy({
    where: { email, verified: false },
  });

  const otp = generateOtp();
  const hashedOtp = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

  await ForgotPasswordOtp.create({
    email,
    otp: hashedOtp,
    expires_at: expiresAt,
  });

  const smsResult = await sendOtpSms(user.number, otp);

  if (!smsResult.success) {
    await ForgotPasswordOtp.destroy({
      where: { email, otp: hashedOtp },
    });

    return {
      success: false,
      message: 'Failed to send OTP. Please try again later.',
    };
  }

  return {
    success: true,
    message: `OTP sent successfully to your registered phone number`,
  };
};

exports.verifyOtp = async ({ email, otp }) => {
  if (!email || !otp) {
    return { success: false, message: 'Email and OTP are required' };
  }

  const hashedOtp = hashOtp(otp);

  const record = await ForgotPasswordOtp.findOne({
    where: {
      email,
      verified: false,
    },
    order: [['createdAt', 'DESC']],
  });

  if (!record) {
    return { success: false, message: 'No OTP request found. Please request a new OTP.' };
  }

  if (record.expires_at < new Date()) {
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  if (record.attempts >= 5) {
    return {
      success: false,
      message: 'Too many failed attempts. Please request a new OTP.',
    };
  }

  if (record.otp !== hashedOtp) {
    await record.update({ attempts: record.attempts + 1 });
    const remainingAttempts = 5 - (record.attempts + 1);
    return {
      success: false,
      message: `Invalid OTP. ${remainingAttempts} ${remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining.`,
    };
  }

  const resetToken = generateResetToken();
  const resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000); 

  await record.update({
    verified: true,
    reset_token: resetToken,
    reset_token_expires: resetTokenExpires,
  });

  return {
    success: true,
    message: 'OTP verified successfully',
    data: {
      reset_token: resetToken,
    },
  };
};

exports.resetPassword = async ({ reset_token, new_password, confirm_password }) => {
  if (!reset_token) {
    return { success: false, message: 'Reset token is required' };
  }

  if (!new_password || !confirm_password) {
    return { success: false, message: 'New password and confirm password are required' };
  }

  if (new_password !== confirm_password) {
    return { success: false, message: 'Passwords do not match' };
  }

  if (new_password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long' };
  }

  const otpRecord = await ForgotPasswordOtp.findOne({
    where: {
      reset_token,
      verified: true,
      reset_token_expires: { [Op.gt]: new Date() },
    },
  });

  if (!otpRecord) {
    return { success: false, message: 'Invalid or expired reset token. Please request a new OTP.' };
  }

  const user = await User.findOne({ where: { email: otpRecord.email } });

  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (!user.is_active) {
    return { success: false, message: 'Account is disabled' };
  }

  const isSamePassword = await comparePassword(new_password, user.password);
  if (isSamePassword) {
    return { success: false, message: 'New password cannot be the same as the current password' };
  }

  const hashedPassword = await hashPassword(new_password);

  await user.update({ password: hashedPassword });

  await otpRecord.update({
    reset_token: null,
    reset_token_expires: null,
  });

  await ForgotPasswordOtp.destroy({
    where: { email: otpRecord.email },
  });

  return {
    success: true,
    message: 'Password reset successfully. Please login with your new password.',
  };
};

exports.changePassword = async (userId, { current_password, new_password, confirm_password }) => {
  if (!current_password || !new_password || !confirm_password) {
    return { success: false, message: 'All fields are required' };
  }

  if (new_password !== confirm_password) {
    return { success: false, message: 'New password and confirm password do not match' };
  }

  if (new_password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long' };
  }

  const user = await User.findByPk(userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (!user.is_active) {
    return { success: false, message: 'Account is disabled' };
  }

  const isMatch = await comparePassword(current_password, user.password);
  if (!isMatch) {
    return { success: false, message: 'Current password is incorrect' };
  }

  if (current_password === new_password) {
    return { success: false, message: 'New password must be different from current password' };
  }

  const hashedPassword = await hashPassword(new_password);
  await user.update({ password: hashedPassword });

  return { success: true, message: 'Password changed successfully' };
};