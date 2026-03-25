const fs = require('fs');
const path = require('path');
const ActivityLog = require('../models/activityLog.model');

const LOGS_DIR = path.join(__dirname, '../../logs');


const getLogFilePath = (storeName, channel) => {
  const now = new Date();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[now.getMonth()];
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const sanitizedStoreName = storeName.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const dirPath = path.join(LOGS_DIR, sanitizedStoreName, channel, monthName);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  return path.join(dirPath, `${dateStr}.log`);
};

const formatLogEntry = (status, action, message, details) => {
  const now = new Date().toISOString().replace('T', ' ').split('.')[0];
  const tag = status === 'success' ? '[SUCCESS]' : '[FAILED]';
  const detailStr = details ? ` | ${JSON.stringify(details)}` : '';
  return `[${now}] ${tag} ${action} | ${message}${detailStr}\n`;
};

const writeToFile = (storeName, channel, logEntry) => {
  try {
    const filePath = getLogFilePath(storeName, channel);
    fs.appendFileSync(filePath, logEntry);
  } catch (error) {
    console.error('Error writing log file:', error.message);
  }
};


const writeToDB = async (logData) => {
  try {
    await ActivityLog.create(logData);
  } catch (error) {
    console.error('Error writing log to DB:', error.message);
  }
};


exports.log = async ({ store_id, store_name, order_id, order_number, channel, action, status, message, details }) => {
  const logEntry = formatLogEntry(status, action, message, details);
  writeToFile(store_name || `store_${store_id}`, channel, logEntry);

  await writeToDB({
    store_id,
    store_name: store_name || null,
    order_id: order_id || null,
    order_number: order_number || null,
    channel,
    action,
    status,
    message,
    details: details || null,
  });
};


exports.logSuccess = async ({ store_id, store_name, order_id, order_number, channel, action, message, details }) => {
  await exports.log({ store_id, store_name, order_id, order_number, channel, action, status: 'success', message, details });
};

exports.logFailed = async ({ store_id, store_name, order_id, order_number, channel, action, message, details }) => {
  await exports.log({ store_id, store_name, order_id, order_number, channel, action, status: 'failed', message, details });
};