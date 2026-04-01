const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { handleWhatsAppSend } = require('../services/whatsappCallback.service');
const { handleVoiceCall } = require('../services/voiceCallback.service');
const { handleOrdifySend } = require('../services/ordifyCallback.service');
const { logFailed } = require('../utils/loggerHelper');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

const worker = new Worker('notifications', async (job) => {
  const { type, store, orderData } = job.data;

  console.log(`📦 Processing job: ${type} | Order: ${orderData.id} | Store: ${store.store_name}`);

  switch (type) {
    case 'whatsapp':
      return await handleWhatsAppSend(store, orderData);

    case 'voice':
      return await handleVoiceCall(orderData, store);

    case 'ordify':
      return await handleOrdifySend(orderData, store);

    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}, {
  connection,
  concurrency: 5, 
  limiter: {
    max: 10,        
    duration: 1000, 
  },
});

worker.on('completed', (job, result) => {
  console.log(`✅ Job completed: ${job.data.type} | Order: ${job.data.orderData.id}`);
});

worker.on('failed', async (job, err) => {
  console.error(`❌ Job failed: ${job.data.type} | Order: ${job.data.orderData.id} | Error: ${err.message}`);
  await logFailed({
    store_id: job.data.store.id,
    store_name: job.data.store.store_name,
    order_id: job.data.orderData.id,
    order_number: job.data.orderData.name,
    channel: job.data.type,
    action: 'queue_job_failed',
    message: `Job failed after ${job.attemptsMade} attempts: ${err.message}`,
    details: { error: err.message, attempts: job.attemptsMade },
  });
});

module.exports = worker;