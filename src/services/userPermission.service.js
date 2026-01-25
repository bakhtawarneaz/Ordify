const UserMenuPermission = require('../models/userMenuPermission.model');

exports.assignPermission = async (payload) => {
  const { user_id, menu_id, can_view, can_create, can_edit, can_delete } = payload;

  const existing = await UserMenuPermission.findOne({
    where: { user_id, menu_id },
  });

  if (existing) {
    await existing.update({ can_view, can_create, can_edit, can_delete });
    return { success: true, message: 'Permission updated' };
  }

  await UserMenuPermission.create({
    user_id,
    menu_id,
    can_view,
    can_create,
    can_edit,
    can_delete,
  });

  return { success: true, message: 'Permission assigned' };
};

exports.getByUser = async (user_id) => {
  const data = await UserMenuPermission.findAll({ where: { user_id } });
  return { success: true, data };
};