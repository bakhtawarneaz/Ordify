const voiceCallbackService = require('../services/voiceCallback.service');

exports.voiceCallback = async (req, reply) => {
  try {
    const res = await voiceCallbackService.handleVoiceCallback(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};