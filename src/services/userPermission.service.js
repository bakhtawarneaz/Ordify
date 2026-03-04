const UserMenuPermission = require('../models/userMenuPermission.model');


exports.assignPermission = async (payload) => {
  const { user_id, permissions } = payload;

  if (!user_id) {
    return { success: false, message: 'user id is required' };
  }

  if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
    return { success: false, message: 'permissions array is required' };
  }

  const results = [];
  const newMenuIds = permissions.map(p => p.menu_id);

  await UserMenuPermission.destroy({
    where: {
      user_id,
      menu_id: { [require('sequelize').Op.notIn]: newMenuIds },
    },
  });

 for (const perm of permissions) {
    const { menu_id, can_view, can_create, can_edit, can_delete } = perm;

    const existing = await UserMenuPermission.findOne({
      where: { user_id, menu_id },
    });

    if (existing) {
      await existing.update({ can_view, can_create, can_edit, can_delete });
      results.push({ menu_id, status: 'updated' });
    } else {
      await UserMenuPermission.create({
        user_id, menu_id, can_view, can_create, can_edit, can_delete,
      });
      results.push({ menu_id, status: 'assigned' });
    }
  }

  return { success: true, message: 'Menu & Permission assigned', data: results };
};
exports.getByUser = async (user_id) => {
  const data = await UserMenuPermission.findAll({ where: { user_id } });
  return { success: true, data };
};