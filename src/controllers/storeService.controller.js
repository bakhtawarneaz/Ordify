const storeServiceService = require('../services/storeService.service');

exports.updateServices = async (req, reply) => {
  try {
    const res = await storeServiceService.updateServices(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getByStore = async (req, reply) => {
  try {
    const res = await storeServiceService.getServicesByStore(req.params.store_id);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};