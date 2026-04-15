const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const AbandonedCheckout = require('../models/abandonedCheckout.model');
const AbandonedCartStoreConfig = require('../models/abandonedCartStoreConfig.model');
const AbandonedCartTemplate = require('../models/abandonedCartTemplate.model');
const Store = require('../models/store.model');
const {
  updateReminderStatus,
  getReminderId,
  verifyCheckoutConverted,
  cancelPendingReminders,
  sendAbandonedCartWhatsApp,
  scheduleNextReminder,
} = require('../utils/abandonedCartHelper');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

const worker = new Worker('abandoned-cart-reminder', async (job) => {
  const { abandonedCheckoutId, reminderNumber, storeId } = job.data;

  console.log(`📦 Processing abandoned cart reminder #${reminderNumber} for checkout: ${abandonedCheckoutId}`);

  const checkout = await AbandonedCheckout.findByPk(abandonedCheckoutId);
  if (!checkout) {
    throw new Error(`Checkout not found: ${abandonedCheckoutId}`);
  }

  if (checkout.status === 'recovered') {
    await updateReminderStatus(abandonedCheckoutId, reminderNumber, 'cancelled', 'Checkout already recovered');
    return { success: true, message: 'Already recovered - skipped' };
  }

  if (checkout.status === 'expired') {
    await updateReminderStatus(abandonedCheckoutId, reminderNumber, 'cancelled', 'Checkout expired');
    return { success: true, message: 'Expired - skipped' };
  }

  const store = await Store.findByPk(storeId);
  if (!store || !store.status) {
    await updateReminderStatus(abandonedCheckoutId, reminderNumber, 'cancelled', 'Store not found or inactive');
    throw new Error(`Store not found or inactive: ${storeId}`);
  }

  const config = await AbandonedCartStoreConfig.findOne({ where: { store_id: storeId } });
  if (!config || !config.is_enabled) {
    await updateReminderStatus(abandonedCheckoutId, reminderNumber, 'cancelled', 'Abandoned cart service disabled');
    return { success: true, message: 'Service disabled - skipped' };
  }

  const reminderConfig = config.reminders.find(r => r.reminder_number === reminderNumber);
  if (!reminderConfig || !reminderConfig.enabled) {
    await updateReminderStatus(abandonedCheckoutId, reminderNumber, 'cancelled', `Reminder #${reminderNumber} disabled`);
    return { success: true, message: `Reminder #${reminderNumber} disabled - skipped` };
  }

  if (!reminderConfig.template_id) {
    await updateReminderStatus(abandonedCheckoutId, reminderNumber, 'failed', 'No template assigned');
    throw new Error(`No template assigned for reminder #${reminderNumber}`);
  }

  const template = await AbandonedCartTemplate.findByPk(reminderConfig.template_id);
  if (!template) {
    await updateReminderStatus(abandonedCheckoutId, reminderNumber, 'failed', `Template not found: ${reminderConfig.template_id}`);
    throw new Error(`Template not found: ${reminderConfig.template_id}`);
  }

  const isConverted = await verifyCheckoutConverted(checkout, store);
  if (isConverted) {
    await checkout.update({ status: 'recovered' });
    await updateReminderStatus(abandonedCheckoutId, reminderNumber, 'cancelled', 'Checkout converted before sending');
    await cancelPendingReminders(abandonedCheckoutId);
    return { success: true, message: 'Converted to order - skipped' };
  }

  await updateReminderStatus(abandonedCheckoutId, reminderNumber, 'processing');

  const reminderId = await getReminderId(abandonedCheckoutId, reminderNumber);

  const result = await sendAbandonedCartWhatsApp({
    checkout,
    template,
    store,
    reminderNumber,
    discountCode: reminderConfig.discount_code,
    reminderId,
  });

  if (!result.success) {
    await updateReminderStatus(abandonedCheckoutId, reminderNumber, 'failed', result.error);
    throw new Error(result.error);
  }

  const now = new Date();
  await updateReminderStatus(abandonedCheckoutId, reminderNumber, 'sent', null, now);

  await checkout.update({
    status: 'reminded',
    reminders_sent: checkout.reminders_sent + 1,
    last_reminder_at: now,
  });

  await scheduleNextReminder({
    abandonedCheckoutId,
    storeId,
    currentReminderNumber: reminderNumber,
    config,
  });

  return { success: true, messageId: result.messageId };
}, {
  connection,
  concurrency: 5,
});

worker.on('completed', (job) => {
  console.log(`✅ Abandoned cart reminder completed: ${job.id}`);
});

worker.on('failed', async (job, err) => {
  console.error(`❌ Abandoned cart reminder failed: ${job.id} | Error: ${err.message} | Attempt: ${job.attemptsMade}`);
});

module.exports = worker;