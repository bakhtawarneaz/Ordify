const service = require('../services/userPermission.service');

exports.assign = async (req, reply) => {
  try {
      const res = await service.assignPermission(req.body);
      return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
      return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.byUser = async (req, reply) => {
  try {
      const res = await service.getByUser(req.body);
      return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
      return reply.code(500).send({ success: false, message: err.message });
  } 
};