const Role = require('../models/role.model');

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

  if (role.name === 'super_admin' && payload.name && payload.name !== 'super_admin') {
    return { success: false, message: 'Cannot rename super_admin role' };
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

  if (role.name === 'super_admin') {
    return { success: false, message: 'Cannot delete super_admin role' };
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

exports.getAllRoles = async () => {
  const roles = await Role.findAll({
    order: [['id', 'ASC']],
  });

  return { success: true, data: roles };
};