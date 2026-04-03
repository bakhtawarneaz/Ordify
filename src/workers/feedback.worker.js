const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const FulfilledOrder = require('../models/fulfilledOrder.model');
const Store = require('../models/store.model');
const Template = require('../models/template.model');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');
const { logSuccess, logFailed } = require('../utils/loggerHelper');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

const worker = new Worker('feedback', async (job) => {
  const { fulfilledOrderId } = job.data;

  console.log(`📦 Processing feedback job for fulfilled order: ${fulfilledOrderId}`);

  const fulfilledOrder = await FulfilledOrder.findByPk(fulfilledOrderId);

  if (!fulfilledOrder) {
    throw new Error(`Fulfilled order not found: ${fulfilledOrderId}`);
  }

  if (fulfilledOrder.feedback_sent) {
    console.log(`⏭️ Feedback already sent for order: ${fulfilledOrder.order_number}`);
    return { success: true, message: 'Already sent' };
  }

  const store = await Store.findByPk(fulfilledOrder.store_id);
  if (!store) {
    throw new Error(`Store not found: ${fulfilledOrder.store_id}`);
  }

  const template = await Template.findOne({
    where: { store_id: store.id, template_type: 'whatsapp', action: 'order_feedback' },
  });

  if (!template) {
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: fulfilledOrder.order_id, order_number: fulfilledOrder.order_number, channel: 'whatsapp', action: 'feedback_sent', message: 'Feedback template not found' });
    throw new Error('Feedback template not found');
  }

  const sendResult = await sendWhatsAppMessage(fulfilledOrder.order_data, template, store, fulfilledOrder.customer_phone);

  const apiResponse = sendResult?.data?.data;
  const messageId = apiResponse?.result?.[0]?.messageId;

  if (!messageId) {
    const errorMsg = apiResponse?.errorMessage || sendResult?.error || 'WhatsApp API error';
    await logFailed({ store_id: store.id, store_name: store.store_name, order_id: fulfilledOrder.order_id, order_number: fulfilledOrder.order_number, channel: 'whatsapp', action: 'feedback_sent', message: `Feedback WhatsApp failed: ${errorMsg}` });
    throw new Error(errorMsg);
  }

  await fulfilledOrder.update({ feedback_sent: true, message_id: messageId });

  await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: fulfilledOrder.order_id, order_number: fulfilledOrder.order_number, channel: 'whatsapp', action: 'feedback_sent', message: `Feedback WhatsApp sent`, details: { phone: fulfilledOrder.customer_phone, messageId } });

  return { success: true, messageId };
}, {
  connection,
  concurrency: 3,
});

worker.on('completed', (job, result) => {
  console.log(`✅ Feedback job completed: ${job.data.fulfilledOrderId}`);
});

worker.on('failed', async (job, err) => {
  console.error(`❌ Feedback job failed: ${job.data.fulfilledOrderId} | Error: ${err.message} | Attempt: ${job.attemptsMade}`);
});

module.exports = worker;