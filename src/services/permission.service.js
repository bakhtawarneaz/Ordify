const RoleMenuPermission = require('../models/roleMenuPermission.model');
const Role = require('../models/role.model');
const Menu = require('../models/menu.model');

exports.assignPermission = async (payload) => {
  const { role_id, menu_id, can_view, can_create, can_edit, can_delete } = payload;

  const role = await Role.findByPk(role_id);
  if (!role) return { success: false, message: 'Invalid role' };

  const menu = await Menu.findByPk(menu_id);
  if (!menu) return { success: false, message: 'Invalid menu' };

  const existing = await RoleMenuPermission.findOne({ where: { role_id, menu_id } });

  if (existing) {
    await existing.update({ can_view, can_create, can_edit, can_delete });
    return { success: true, message: 'Permission updated', data: existing };
  }

  const permission = await RoleMenuPermission.create({
    role_id,
    menu_id,
    can_view: !!can_view,
    can_create: !!can_create,
    can_edit: !!can_edit,
    can_delete: !!can_delete,
  });

  return { success: true, message: 'Permission assigned', data: permission };
};

exports.getPermissionsByRole = async (role_id) => {
  const permissions = await RoleMenuPermission.findAll({
    where: { role_id },
    include: [{ model: Menu, as: 'menu' }],
  });

  return { success: true, data: permissions };
};

exports.removePermission = async (id) => {
  const permission = await RoleMenuPermission.findByPk(id);
  if (!permission) return { success: false, message: 'Permission not found' };

  await permission.destroy();
  return { success: true, message: 'Permission removed' };
};