const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const VoiceResponse = require('../models/voiceResponse.model');
const Store = require('../models/store.model');
const Order = require('../models/order.model');
const { sendVoiceCall } = require('../utils/voiceHelper');
const { hasExistingTag } = require('../utils/tagHelper');
const { logSuccess, logFailed } = require('../utils/loggerHelper');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

const worker = new Worker('voice-reattempt', async (job) => {
  const { voiceResponseId } = job.data;

  console.log(`📦 Processing voice reattempt job for voice response: ${voiceResponseId}`);

  const voiceResponse = await VoiceResponse.findByPk(voiceResponseId);

  if (!voiceResponse) {
    throw new Error(`Voice response not found: ${voiceResponseId}`);
  }

  if (voiceResponse.action_taken) {
    console.log(`⏭️ Action already taken for order: ${voiceResponse.order_id}`);
    return { success: true, message: 'Action already taken - skipped' };
  }

  const store = await Store.findByPk(voiceResponse.store_id);
  if (!store) {
    throw new Error(`Store not found: ${voiceResponse.store_id}`);
  }

  const { hasOurTag } = await hasExistingTag(store, voiceResponse.order_id); 

  if (hasOurTag) {
    await voiceResponse.update({ action_taken: true });
    console.log(`⏭️ Tag already exists for order: ${voiceResponse.order_id}`);
    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: voiceResponse.order_id, channel: 'voice', action: 'voice_reattempt_skipped', message: 'Tag already exists - voice reattempt skipped' });
    return { success: true, message: 'Tag exists - skipped' };
  }

  const maxAttemptsSetting = store.voice_reattempt_max_count || 3;
  const maxAttempts = parseInt(maxAttemptsSetting) || 3;

  if (voiceResponse.reattempt_count >= maxAttempts) {
    console.log(`⏭️ Max voice reattempts reached for order: ${voiceResponse.order_id}`);
    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: voiceResponse.order_id, channel: 'voice', action: 'voice_reattempt_skipped', message: `Max voice reattempts (${maxAttempts}) reached` });
    return { success: true, message: 'Max voice reattempts reached' };
  }

  const order = await Order.findOne({
    where: { order_id: voiceResponse.order_id, store_id: store.id },
  });

  if (!order || !order.order_data) {
    throw new Error(`Order data not found: ${voiceResponse.order_id}`);
  }

  const sendResult = await sendVoiceCall(order.order_data, store);

  if (!sendResult?.success) {
    const errorMsg = sendResult?.error || 'Voice call failed';
    await logFailed({ 
      store_id: store.id, 
      store_name: store.store_name, 
      order_id: voiceResponse.order_id, 
      channel: 'voice', 
      action: 'voice_reattempt_sent', 
      message: `Voice reattempt failed: ${errorMsg}`, 
      details: { phone: voiceResponse.phone_number, error: errorMsg, attempt: voiceResponse.reattempt_count + 1 } 
    });
    throw new Error(errorMsg);
  }
  
  const newCdrId = sendResult?.response?.CdrID || null;

  await voiceResponse.update({
    reattempt_count: voiceResponse.reattempt_count + 1,
    cdr_id: newCdrId,
  });

  await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: voiceResponse.order_id, order_number: order?.order_number, channel: 'voice', action: 'voice_reattempt_sent', message: `Voice reattempt ${voiceResponse.reattempt_count} sent`, details: { phone: voiceResponse.phone_number, cdrId: newCdrId, attempt: voiceResponse.reattempt_count } });

  // Schedule next reattempt if needed
  if (voiceResponse.reattempt_count < maxAttempts) {
    const { voiceReattemptQueue } = require('../config/queue');
    const delayMinutesSetting = store.voice_reattempt_delay_minutes || 60;
    const delayMinutes = parseInt(delayMinutesSetting) || 60;
    const delayMs = delayMinutes * 60 * 1000;

    await voiceReattemptQueue.add('voice-reattempt-check', {
      voiceResponseId: voiceResponse.id,
    }, {
      delay: delayMs,
      attempts: 2,
      backoff: { type: 'exponential', delay: 30000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }

  return { success: true, cdrId: newCdrId };
}, {
  connection,
  concurrency: 3,
});

worker.on('completed', (job, result) => {
  console.log(`✅ Voice reattempt job completed: ${job.data.voiceResponseId}`);
});

worker.on('failed', async (job, err) => {
  console.error(`❌ Voice reattempt job failed: ${job.data.voiceResponseId} | Error: ${err.message} | Attempt: ${job.attemptsMade}`);
});

module.exports = worker;