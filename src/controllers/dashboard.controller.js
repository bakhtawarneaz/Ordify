// const dashboardService = require('../services/dashboard.service');

// exports.getDashboard = async (req, reply) => {
//   try {
//     const res = await dashboardService.getDashboard(req.query);
//     return reply.code(200).send(res);
//   } catch (err) {
//     return reply.code(500).send({ success: false, message: err.message });
//   }
// };

// exports.getOrderStats = async (req, reply) => {
//   try {
//     const res = await dashboardService.getOrderStats(req.query);
//     return reply.code(200).send(res);
//   } catch (err) {
//     return reply.code(500).send({ success: false, message: err.message });
//   }
// };

// exports.getMessageStats = async (req, reply) => {
//   try {
//     const res = await dashboardService.getMessageStats(req.query);
//     return reply.code(200).send(res);
//   } catch (err) {
//     return reply.code(500).send({ success: false, message: err.message });
//   }
// };

// exports.getTagStats = async (req, reply) => {
//   try {
//     const res = await dashboardService.getTagStats(req.query);
//     return reply.code(200).send(res);
//   } catch (err) {
//     return reply.code(500).send({ success: false, message: err.message });
//   }
// };

// exports.getStoreBreakdown = async (req, reply) => {
//   try {
//     const res = await dashboardService.getStoreBreakdown();
//     return reply.code(200).send(res);
//   } catch (err) {
//     return reply.code(500).send({ success: false, message: err.message });
//   }
// };

// exports.getRetryStats = async (req, reply) => {
//   try {
//     const res = await dashboardService.getRetryStats(req.query);
//     return reply.code(200).send(res);
//   } catch (err) {
//     return reply.code(500).send({ success: false, message: err.message });
//   }
// };

// exports.getActiveStores = async (req, reply) => {
//   try {
//     const res = await dashboardService.getActiveStores();
//     return reply.code(200).send(res);
//   } catch (err) {
//     return reply.code(500).send({ success: false, message: err.message });
//   }
// };

const dashboardService = require('../services/dashboard.service');

exports.getDashboard = async (req, reply) => {
  try {
    const res = await dashboardService.getDashboard(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getOrderStats = async (req, reply) => {
  try {
    const res = await dashboardService.getOrderStats(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getMessageStats = async (req, reply) => {
  try {
    const res = await dashboardService.getMessageStats(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getTagStats = async (req, reply) => {
  try {
    const res = await dashboardService.getTagStats(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getStoreBreakdown = async (req, reply) => {
  try {
    const res = await dashboardService.getStoreBreakdown();
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getRetryStats = async (req, reply) => {
  try {
    const res = await dashboardService.getRetryStats(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getActiveStores = async (req, reply) => {
  try {
    const res = await dashboardService.getActiveStores();
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getPaymentTypeStats = async (req, reply) => {
  try {
    const res = await dashboardService.getPaymentTypeStats(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getTemplateOverview = async (req, reply) => {
  try {
    const res = await dashboardService.getTemplateOverview(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};