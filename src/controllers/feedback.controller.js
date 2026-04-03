const feedbackService = require('../services/feedback.service');

exports.feedbackCallback = async (req, reply) => {
  try {
    const res = await feedbackService.handleFeedbackResponse(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};