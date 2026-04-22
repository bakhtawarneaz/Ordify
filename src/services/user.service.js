const User = require('../models/user.model');
const Role = require('../models/role.model');
const bcrypt = require('bcrypt');
const { getPagination, getPaginationResponse } = require('../utils/paginationHelper');

exports.createUser = async (payload) => {
  const { name, email, password, number, image, role_id, is_active, website } = payload;

  if (!name || !email || !password) {
    return { success: false, message: 'name, email and password are required' };
  }

  const exists = await User.findOne({ where: { email } });
  if (exists) {
    return { success: false, message: 'Email already exists' };
  }

  if (role_id) {
    const role = await Role.findByPk(role_id);
    if (!role) {
      return { success: false, message: 'Invalid role_id' };
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    number: number || null,
    image: image || null,
    role_id: role_id || null,
    is_active: is_active !== undefined ? is_active : true,
    website: website || null, 
  });

  const userData = user.toJSON();
  delete userData.password;

  return { success: true, message: 'User created successfully', data: userData };
};

exports.updateUser = async (id, payload) => {
  const user = await User.findByPk(id);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  if (payload.email && payload.email !== user.email) {
    const exists = await User.findOne({ where: { email: payload.email } });
    if (exists) {
      return { success: false, message: 'Email already exists' };
    }
  }

  if (payload.role_id) {
    const role = await Role.findByPk(payload.role_id);
    if (!role) {
      return { success: false, message: 'Invalid role_id' };
    }
  }

  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, 10);
  }

  await user.update(payload);

  const userData = user.toJSON();
  delete userData.password;

  return { success: true, message: 'User updated successfully', data: userData };
};

exports.deleteUser = async (id) => {
  const user = await User.findByPk(id);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  await user.destroy();
  return { success: true, message: 'User deleted successfully' };
};

exports.getUserById = async (id) => {
  const user = await User.findByPk(id, {
    attributes: { exclude: ['password'] },
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
  });

  if (!user) {
    return { success: false, message: 'User not found' };
  }

  return { success: true, data: user };
};

exports.getAllUsers = async (query) => {
  const where = {};

  if (query.role_id) {
    where.role_id = query.role_id;
  }

  if (query.is_active !== undefined) {
    where.is_active = query.is_active;
  }

  const { page: pageNum, limit: pageSize, offset } = getPagination(query);

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password'] },
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
    order: [['id', 'ASC']],
    limit: pageSize,
    offset,
  });

  return {
    success: true,
    data: rows,
    pagination: getPaginationResponse(count, pageNum, pageSize),
  };
};

exports.toggleStatus = async (id) => {
  const user = await User.findByPk(id);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  await user.update({ is_active: !user.is_active });

  return {
    success: true,
    message: user.is_active ? 'User activated successfully' : 'User deactivated successfully',
  };
};