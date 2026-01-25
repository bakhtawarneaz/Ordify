const RoleMenuPermission = require('../models/roleMenuPermission.model');
const Menu = require('../models/menu.model');

/**
 * Generic permission checker
 * @param {'view'|'create'|'edit'|'delete'} action
 * @param {string} menuKey
 */
const canAccess = (action, menuKey) => {
  return async (req, reply) => {
    try {
      // authMiddleware ne req.user set kar diya hota hai
      const { role_id } = req.user;
      if (!role_id) {
        return reply.code(401).send({ success: false, message: 'Unauthorized' });
      }

      const menu = await Menu.findOne({
        where: { key: menuKey, is_active: true },
      });

      if (!menu) {
        return reply.code(403).send({
          success: false,
          message: 'Menu not found or inactive',
        });
      }

      const permission = await RoleMenuPermission.findOne({
        where: {
          role_id,
          menu_id: menu.id,
        },
      });

      if (!permission) {
        return reply.code(403).send({
          success: false,
          message: 'Access denied',
        });
      }

      const map = {
        view: 'can_view',
        create: 'can_create',
        edit: 'can_edit',
        delete: 'can_delete',
      };

      const field = map[action];
      if (!permission[field]) {
        return reply.code(403).send({
          success: false,
          message: `You do not have ${action} permission`,
        });
      }

      return; // ✅ Fastify flow continue
    } catch (err) {
      return reply.code(500).send({
        success: false,
        message: err.message,
      });
    }
  };
};

// Sugar helpers (clean routes)
exports.canView = (menuKey) => canAccess('view', menuKey);
exports.canCreate = (menuKey) => canAccess('create', menuKey);
exports.canEdit = (menuKey) => canAccess('edit', menuKey);
exports.canDelete = (menuKey) => canAccess('delete', menuKey);