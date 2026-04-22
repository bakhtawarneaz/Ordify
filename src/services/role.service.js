const Role = require('../models/role.model');
const User = require('../models/user.model');
const { getPagination, getPaginationResponse } = require('../utils/paginationHelper');

exports.createRole = async (payload) => {
  const { name, description } = payload;

  if (!name) {
    return { success: false, message: 'Role name is required' };
  }

  const exists = await Role.findOne({ where: { name } });
  if (exists) {
    return { success: false, message: 'Role already exists' };
  }

  const role = await Role.create({ name, description });
  return { success: true, message: 'Role created successfully', data: role };
};

exports.updateRole = async (id, payload) => {
  const role = await Role.findByPk(id);
  if (!role) {
    return { success: false, message: 'Role not found' };
  }

  if (role.name === 'Super Admin' && payload.name && payload.name !== 'Super Admin') {
    return { success: false, message: 'Cannot rename Super Admin role' };
  }
  
  if (payload.name) {
    const exists = await Role.findOne({ where: { name: payload.name } });
    if (exists && exists.id !== parseInt(id)) {
      return { success: false, message: 'Role name already exists' };
    }
  }

  await role.update(payload);
  return { success: true, message: 'Role updated successfully', data: role };
};

exports.deleteRole = async (id) => {
  const role = await Role.findByPk(id);
  if (!role) {
    return { success: false, message: 'Role not found' };
  }

  if (role.name === 'Super Admin') {
    return { success: false, message: 'Cannot delete super_admin role' };
  }

  const userCount = await User.count({ where: { role_id: id } });
  
  if (userCount > 0) {
    return {
      success: false,
      message: `This role cannot be deleted because ${userCount} ${userCount === 1 ? 'user is' : 'users are'} currently assigned to it. Please reassign or remove those users first.`,
    };
  }


  await role.destroy();
  return { success: true, message: 'Role deleted successfully' };
};

exports.getRoleById = async (id) => {
  const role = await Role.findByPk(id);
  if (!role) {
    return { success: false, message: 'Role not found' };
  }

  return { success: true, data: role };
};

exports.getAllRoles = async (query = {}) => {

  const { page: pageNum, limit: pageSize, offset } = getPagination(query);

  const { count, rows } = await Role.findAndCountAll({
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