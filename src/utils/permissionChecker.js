const UserMenuPermission = require('../models/userMenuPermission.model');
const Menu = require('../models/menu.model');


const canAccess = (action, menuKey) => {
  return async (req, reply) => {
    try {
      const { id: user_id, role } = req.user;

      // 🔥 Super Admin = full access
      if (role === 'super_admin') {
        return;
      }

      const menu = await Menu.findOne({
        where: { key: menuKey, is_active: true },
      });

      if (!menu) {
        return reply.code(403).send({
          success: false,
          message: 'Menu not available',
        });
      }

      const permission = await UserMenuPermission.findOne({
        where: { user_id, menu_id: menu.id },
      });

      if (!permission) {
        return reply.code(403).send({
          success: false,
          message: 'Permission not assigned',
        });
      }

      const map = {
        view: 'can_view',
        create: 'can_create',
        edit: 'can_edit',
        delete: 'can_delete',
      };

      if (!permission[map[action]]) {
        return reply.code(403).send({
          success: false,
          message: `No ${action} permission`,
        });
      }

      return; // ✅ allow
    } catch (err) {
      return reply.code(500).send({
        success: false,
        message: err.message,
      });
    }
  };
};

exports.canView = (menuKey) => canAccess('view', menuKey);
exports.canCreate = (menuKey) => canAccess('create', menuKey);
exports.canEdit = (menuKey) => canAccess('edit', menuKey);
exports.canDelete = (menuKey) => canAccess('delete', menuKey);