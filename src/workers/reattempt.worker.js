const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const WhatsAppMessageResponse = require('../models/whatsappMessageResponse.model');
const Store = require('../models/store.model');
const Order = require('../models/order.model');
const Template = require('../models/template.model');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');
const { hasExistingTag } = require('../utils/tagHelper');
const { logSuccess, logFailed } = require('../utils/loggerHelper');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

const worker = new Worker('reattempt', async (job) => {
  const { messageResponseId } = job.data;

  console.log(`📦 Processing reattempt job for message response: ${messageResponseId}`);

  const messageResponse = await WhatsAppMessageResponse.findByPk(messageResponseId);

  if (!messageResponse) {
    throw new Error(`Message response not found: ${messageResponseId}`);
  }

  if (messageResponse.action_taken) {
    console.log(`⏭️ Action already taken for order: ${messageResponse.order_id}`);
    return { success: true, message: 'Action already taken - skipped' };
  }

  const store = await Store.findByPk(messageResponse.store_id);
  if (!store) {
    throw new Error(`Store not found: ${messageResponse.store_id}`);
  }

  const { hasOurTag } = await hasExistingTag(store, messageResponse.order_id);

  if (hasOurTag) {
    await messageResponse.update({ action_taken: true });
    console.log(`⏭️ Tag already exists for order: ${messageResponse.order_id}`);
    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: messageResponse.order_id, channel: 'whatsapp', action: 'reattempt_skipped', message: 'Tag already exists - reattempt skipped' });
    return { success: true, message: 'Tag exists - skipped' };
  }

  const maxAttemptsSetting = store.reattempt_max_count || 3;
  const maxAttempts = parseInt(maxAttemptsSetting) || 1;

  if (messageResponse.reattempt_count >= maxAttempts) {
    console.log(`⏭️ Max reattempts reached for order: ${messageResponse.order_id}`);
    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: messageResponse.order_id, channel: 'whatsapp', action: 'reattempt_skipped', message: `Max reattempts (${maxAttempts}) reached` });
    return { success: true, message: 'Max reattempts reached' };
  }

  const order = await Order.findOne({
    where: { order_id: messageResponse.order_id, store_id: store.id },
  });

  if (!order || !order.order_data) {
    throw new Error(`Order data not found: ${messageResponse.order_id}`);
  }

  let template = await Template.findOne({
    where: { store_id: store.id, template_type: 'whatsapp', action: 'reattempt' },
  });

  if (!template) {
    const isCOD = order.order_data.payment_gateway_names?.includes('Cash on Delivery (COD)');
    const paymentType = isCOD ? 'post_paid' : 'pre_paid';

    template = await Template.findOne({
      where: { store_id: store.id, template_type: 'whatsapp', payment_type: paymentType },
    });

    if (!template) {
      template = await Template.findOne({
        where: { store_id: store.id, template_type: 'whatsapp', payment_type: 'both' },
      });
    }
  }

  if (!template) {
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: messageResponse.order_id, channel: 'whatsapp', action: 'reattempt_sent', message: 'Reattempt template not found' });
    throw new Error('Reattempt template not found');
  }

  const sendResult = await sendWhatsAppMessage(order.order_data, template, store, messageResponse.phone_number);

  const apiResponse = sendResult?.data?.data;
  const newMessageId = apiResponse?.result?.[0]?.messageId;

  if (!newMessageId) {
    const errorMsg = apiResponse?.errorMessage || sendResult?.error || 'WhatsApp API error';
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: messageResponse.order_id, channel: 'whatsapp', action: 'reattempt_sent', message: `Reattempt failed: ${errorMsg}`, details: { phone: messageResponse.phone_number, error: errorMsg, attempt: messageResponse.reattempt_count + 1 } });
    throw new Error(errorMsg);
  }

  await messageResponse.update({
    reattempt_count: messageResponse.reattempt_count + 1,
    message_id: newMessageId,
  });

  await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: messageResponse.order_id, channel: 'whatsapp', action: 'reattempt_sent', message: `Reattempt ${messageResponse.reattempt_count} sent`, details: { phone: messageResponse.phone_number, messageId: newMessageId, attempt: messageResponse.reattempt_count } });

  if (messageResponse.reattempt_count < maxAttempts) {
    const { reattemptQueue } = require('../config/queue');
    const delayMinutesSetting = store.reattempt_delay_minutes || 60;
    const delayMinutes = parseInt(delayMinutesSetting) || 60;
    const delayMs = delayMinutes * 60 * 1000;

    await reattemptQueue.add('reattempt-check', {
      messageResponseId: messageResponse.id,
    }, {
      delay: delayMs,
      attempts: 2,
      backoff: { type: 'exponential', delay: 30000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }

  return { success: true, messageId: newMessageId };
}, {
  connection,
  concurrency: 3,
});

worker.on('completed', (job, result) => {
  console.log(`✅ Reattempt job completed: ${job.data.messageResponseId}`);
});

worker.on('failed', async (job, err) => {
  console.error(`❌ Reattempt job failed: ${job.data.messageResponseId} | Error: ${err.message} | Attempt: ${job.attemptsMade}`);
});

module.exports = worker;