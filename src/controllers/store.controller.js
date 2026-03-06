const service = require('../services/store.service');

exports.add = async (req, reply) => {
  try {
      const res = await service.add(req.body);
      return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
      return reply.code(500).send({ success: false, message: err.message });
  }
};

// Controller function to get all stores
exports.allStores = async (req, reply) => {
  try {
      // Call service function to fetch all stores
      const res = await service.getAllStores();

      // Return response
      return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
      return reply.code(500).send({ success: false, message: err.message });
  }
};


exports.byId = async (req, reply) => {
  try {
      const { id } = req.params;
      const res = await service.getById(id);
      return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
      return reply.code(500).send({ success: false, message: err.message });
  } 
};