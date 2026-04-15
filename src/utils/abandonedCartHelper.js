const AbandonedCartReminder = require('../models/abandonedCartReminder.model');
const AbandonedCartMessageLog = require('../models/abandonedCartMessageLog.model');
const { abandonedCartReminderQueue } = require('../config/queue');
const { sendWhatsAppMessage } = require('../utils/whatsappHelper');
const { logSuccess, logFailed } = require('../utils/loggerHelper');
const axios = require('axios');


const updateReminderStatus = async (checkoutId, reminderNumber, status, errorMessage = null, sentAt = null) => {
  const reminder = await AbandonedCartReminder.findOne({
    where: { abandoned_checkout_id: checkoutId, reminder_number: reminderNumber },
  });
  if (reminder) {
    const updateData = { status };
    if (errorMessage) updateData.error_message = errorMessage;
    if (sentAt) updateData.sent_at = sentAt;
    if (status === 'failed') updateData.retry_count = reminder.retry_count + 1;
    await reminder.update(updateData);
  }
};


const getReminderId = async (checkoutId, reminderNumber) => {
  const reminder = await AbandonedCartReminder.findOne({
    where: { abandoned_checkout_id: checkoutId, reminder_number: reminderNumber },
  });
  return reminder?.id || null;
};


const verifyCheckoutConverted = async (checkout, store) => {
  try {
    if (!checkout.shopify_checkout_token) return false;

    const cleanUrl = store.store_url.replace(/^https?:\/\//, '');
    const url = `https://${cleanUrl}/admin/api/2025-01/orders.json?checkout_token=${checkout.shopify_checkout_token}&status=any&limit=1`;

    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': store.access_token,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    return response.data?.orders?.length > 0;
  } catch (error) {
    console.error(`⚠️ Checkout verify error: ${error.message}`);
    return false;
  }
};

const cancelPendingReminders = async (checkoutId) => {
  const pendingReminders = await AbandonedCartReminder.findAll({
    where: { abandoned_checkout_id: checkoutId, status: 'scheduled' },
  });

  for (const reminder of pendingReminders) {
    if (reminder.bullmq_job_id) {
      try {
        const job = await abandonedCartReminderQueue.getJob(reminder.bullmq_job_id);
        if (job) await job.remove();
      } catch (err) {
        console.error(`⚠️ Could not remove job ${reminder.bullmq_job_id}: ${err.message}`);
      }
    }
    await reminder.update({ status: 'cancelled', error_message: 'Checkout recovered' });
  }
};

const sendAbandonedCartWhatsApp = async ({ checkout, template, store, reminderNumber, discountCode, reminderId }) => {
  const sendResult = await sendWhatsAppMessage(
    checkout.cart_items,
    template,
    store,
    checkout.customer_phone
  );

  const apiResponse = sendResult?.data?.data;
  const messageId = apiResponse?.result?.[0]?.messageId;

  if (!messageId) {
    const errorMsg = apiResponse?.errorMessage || sendResult?.error || 'WhatsApp API error';

    await AbandonedCartMessageLog.create({
      store_id: store.id,
      abandoned_checkout_id: checkout.id,
      reminder_id: reminderId || null,
      template_id: template.id,
      reminder_number: reminderNumber || null,
      customer_phone: checkout.customer_phone,
      discount_code: discountCode || null,
      whatsapp_status: 'failed',
      whatsapp_response: apiResponse || sendResult,
      error_message: errorMsg,
    });

    await logFailed({
      store_id: store.id, store_name: store.store_name,
      order_id: checkout.shopify_checkout_id, order_number: `CART-${checkout.id}`,
      channel: 'whatsapp', action: `abandoned_cart_reminder_${reminderNumber || 'manual'}`,
      message: `Reminder failed: ${errorMsg}`,
      details: { phone: checkout.customer_phone, template_id: template.id, error: errorMsg },
    });

    return { success: false, error: errorMsg };
  }

  await AbandonedCartMessageLog.create({
    store_id: store.id,
    abandoned_checkout_id: checkout.id,
    reminder_id: reminderId || null,
    template_id: template.id,
    reminder_number: reminderNumber || null,
    customer_phone: checkout.customer_phone,
    discount_code: discountCode || null,
    whatsapp_message_id: messageId,
    whatsapp_status: 'sent',
    whatsapp_response: apiResponse,
  });

  await logSuccess({
    store_id: store.id, store_name: store.store_name,
    order_id: checkout.shopify_checkout_id, order_number: `CART-${checkout.id}`,
    channel: 'whatsapp', action: `abandoned_cart_reminder_${reminderNumber || 'manual'}`,
    message: `Reminder sent to ${checkout.customer_phone}`,
    details: { phone: checkout.customer_phone, messageId, template_id: template.id },
  });

  return { success: true, messageId };
};


const scheduleNextReminder = async ({ abandonedCheckoutId, storeId, currentReminderNumber, config }) => {
  const nextReminderNumber = currentReminderNumber + 1;
  const nextReminderConfig = config.reminders.find(r => r.reminder_number === nextReminderNumber);

  if (!nextReminderConfig || !nextReminderConfig.enabled || !nextReminderConfig.template_id) {
    return { scheduled: false };
  }

  const existing = await AbandonedCartReminder.findOne({
    where: { abandoned_checkout_id: abandonedCheckoutId, reminder_number: nextReminderNumber },
  });
  if (existing) return { scheduled: false };

  const delayMs = nextReminderConfig.delay_minutes * 60 * 1000;

  const job = await abandonedCartReminderQueue.add(
    `reminder-${nextReminderNumber}`,
    {
      abandonedCheckoutId,
      reminderNumber: nextReminderNumber,
      storeId,
    },
    {
      delay: delayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 172800 },
    }
  );

  await AbandonedCartReminder.create({
    abandoned_checkout_id: abandonedCheckoutId,
    store_id: storeId,
    reminder_number: nextReminderNumber,
    template_id: nextReminderConfig.template_id,
    bullmq_job_id: job.id,
    discount_code: nextReminderConfig.discount_code,
    scheduled_at: new Date(Date.now() + delayMs),
    status: 'scheduled',
  });

  console.log(`📅 Reminder #${nextReminderNumber} scheduled for checkout ${abandonedCheckoutId}`);
  return { scheduled: true };
};


const scheduleFirstReminder = async (checkout, store, config) => {
  const firstReminderConfig = config.reminders.find(r => r.reminder_number === 1);

  if (!firstReminderConfig || !firstReminderConfig.enabled || !firstReminderConfig.template_id) {
    return { scheduled: false };
  }

  const existing = await AbandonedCartReminder.findOne({
    where: { abandoned_checkout_id: checkout.id, reminder_number: 1 },
  });
  if (existing) return { scheduled: false };

  const delayMs = firstReminderConfig.delay_minutes * 60 * 1000;

  const job = await abandonedCartReminderQueue.add(
    'reminder-1',
    {
      abandonedCheckoutId: checkout.id,
      reminderNumber: 1,
      storeId: store.id,
    },
    {
      delay: delayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 172800 },
    }
  );

  await AbandonedCartReminder.create({
    abandoned_checkout_id: checkout.id,
    store_id: store.id,
    reminder_number: 1,
    template_id: firstReminderConfig.template_id,
    bullmq_job_id: job.id,
    discount_code: firstReminderConfig.discount_code,
    scheduled_at: new Date(Date.now() + delayMs),
    status: 'scheduled',
  });

  console.log(`📅 First reminder scheduled for checkout ${checkout.id} (${firstReminderConfig.delay_minutes} min)`);
  return { scheduled: true };
};

module.exports = {
  updateReminderStatus,
  getReminderId,
  verifyCheckoutConverted,
  cancelPendingReminders,
  sendAbandonedCartWhatsApp,
  scheduleNextReminder,
  scheduleFirstReminder
};