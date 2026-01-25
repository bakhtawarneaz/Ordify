const User = require('../models/user.model');
const Role = require('../models/role.model');
const { hashPassword, comparePassword } = require('../utils/bcrypt');
const { generateToken } = require('../utils/jwt');

exports.register = async ({ name, email, password, role_id, number, image }) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return { success: false, message: 'Email already exists' };
  }

  const role = await Role.findByPk(role_id);
  if (!role) {
    return { success: false, message: 'Invalid role' };
  }

  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role_id,
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
