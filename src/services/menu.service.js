const Menu = require('../models/menu.model');

exports.createMenu = async (payload) => {
  const { name, key, route, icon, parent_id, order_no, is_active } = payload;

  const exists = await Menu.findOne({ where: { key } });
  if (exists) {
    return { success: false, message: 'Menu key already exists' };
  }

  const menu = await Menu.create({
    name,
    key,
    route,
    icon,
    parent_id: parent_id || null,
    order_no: order_no || 0,
    is_active: is_active !== undefined ? is_active : true,
  });

  return { success: true, message: 'Menu created successfully', data: menu };
};

exports.updateMenu = async (id, payload) => {
  const menu = await Menu.findByPk(id);
  if (!menu) {
    return { success: false, message: 'Menu not found' };
  }

  await menu.update(payload);
  return { success: true, message: 'Menu updated successfully', data: menu };
};

exports.toggleMenuStatus = async ({ id, is_active }) => {
  const menu = await Menu.findByPk(id);
  if (!menu) {
    return { success: false, message: 'Menu not found' };
  }
  await menu.update({ is_active });
  return {
    success: true,
    message: is_active ? 'Menu enabled successfully' : 'Menu disabled successfully',
  };
};

exports.getMenuById = async (id) => {
  const menu = await Menu.findByPk(id);
  if (!menu) {
    return { success: false, message: 'Menu not found' };
  }

  return { success: true, data: menu };
};

exports.getAllMenus = async () => {
  const menus = await Menu.findAll({
    where: { is_active: true },
    order: [['order_no', 'ASC']],
    include: [
      {
        model: Menu,
        as: 'children',
        where: { is_active: true },
        required: false,
        order: [['order_no', 'ASC']],
      },
    ],
  });

  return { success: true, data: menus };
};