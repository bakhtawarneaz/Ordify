const campaignService = require('../services/campaign.service');

exports.create = async (req, reply) => {
  try {
    const res = await campaignService.createCampaign(req.body);
    return reply.code(res.success ? 201 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.update = async (req, reply) => {
  try {
    const res = await campaignService.updateCampaign(req.params.id, req.body);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.delete = async (req, reply) => {
  try {
    const res = await campaignService.deleteCampaign(req.params.id);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.toggleStatus = async (req, reply) => {
  try {
    const res = await campaignService.toggleCampaignStatus(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getOne = async (req, reply) => {
  try {
    const res = await campaignService.getCampaignById(req.params.id);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getAll = async (req, reply) => {
  try {
    const res = await campaignService.getAllCampaigns(req.query);
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.regenerateToken = async (req, reply) => {
  try {
    const res = await campaignService.regeneratePublicToken(req.params.id);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.report = async (req, reply) => {
  try {
    const res = await campaignService.getCampaignReport(req.params.id);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.storeDashboard = async (req, reply) => {
  try {
    const res = await campaignService.getStoreDashboard(req.body);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.publicReport = async (req, reply) => {
  try {
    const res = await campaignService.getPublicCampaignReport(req.params.code, req.query.token);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.publicReportExcel = async (req, reply) => {
  try {
    const res = await campaignService.generatePublicReportExcel(req.params.code, req.query.token);
    if (!res.success) {
      return reply.code(404).send(res);
    }
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename=${res.filename}`)
      .send(res.buffer);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};