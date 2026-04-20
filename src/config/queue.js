const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

connection.on('connect', () => {
  console.log('✅ Redis connected');
});

connection.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

const notificationQueue = new Queue('notifications', { connection });
const feedbackQueue = new Queue('feedback', { connection });
const reattemptQueue = new Queue('reattempt', { connection });
const abandonedCartReminderQueue = new Queue('abandoned-cart-reminder', { connection });
const abandonedCartSyncQueue = new Queue('abandoned-cart-sync', { connection });
const voiceReattemptQueue = new Queue('voice-reattempt', { connection });

module.exports = {
  connection,
  notificationQueue,
  feedbackQueue,
  reattemptQueue,
  abandonedCartReminderQueue,
  abandonedCartSyncQueue,
  voiceReattemptQueue,
};