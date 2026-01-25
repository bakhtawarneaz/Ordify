const permissionService = require('../services/permission.service');

exports.assign = async (req, reply) => {
  try {
    const res = await permissionService.assignPermission(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.byRole = async (req, reply) => {
  try {
    const res = await permissionService.getPermissionsByRole(req.params.role_id);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.remove = async (req, reply) => {
  try {
    const res = await permissionService.removePermission(req.params.id);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};