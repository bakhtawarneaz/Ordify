const { captureOrderPayment, cancelShopifyOrder } = require('./shopifyHelper');
const { getActiveServices } = require('../services/storeSetting.service');
const { logSuccess, logFailed } = require('./loggerHelper');
const { sendSessionWhatsApp } = require('./sessionHelper');
const { findAndApplyTag } = require('./tagHelper');
const Order = require('../models/order.model');

exports.handlePostCallbackActions = async (store, orderId, meaning, channel, existingTagsString, extraLog = {}) => {
  const results = {};
  const order = await Order.findOne({ where: { order_id: orderId, store_id: store.id } });
  const orderNumber = order?.order_number || null;
  const services = await getActiveServices(store.id);

  const taggingActive = services.isActive('tagging');
  if (taggingActive) {
    const tagResult = await findAndApplyTag(store, orderId, meaning, channel, existingTagsString);
    if (tagResult.success) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, order_number: orderNumber, channel, action: 'tag_added', message: `Tag "${tagResult.tag}" added`, details: { tag: tagResult.tag, meaning, ...extraLog } });
      results.tag = { success: true, message: `Tag "${tagResult.tag}" added` };
    } else {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, order_number: orderNumber, channel, action: 'tag_added', message: `Tag failed: ${tagResult.message}`, details: { meaning, ...extraLog } });
      results.tag = { success: false, message: tagResult.message };
    }
  } else {
    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, order_number: orderNumber, channel, action: 'tag_skipped', message: 'Tagging not enabled for this store' });
    results.tag = { success: true, message: 'Tagging not enabled for this store' };
  }

  const shopifyActionActive = services.isActive('shopify_order_action');
  if (shopifyActionActive) {
    if (meaning === 'confirm') {
      const result = await captureOrderPayment(store, orderId);
      if (result.success) {
        await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, order_number: orderNumber, channel, action: 'shopify_order_confirmed', message: result.message });
      } else {
        await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, order_number: orderNumber, channel, action: 'shopify_order_confirmed', message: `Shopify confirm failed: ${result.message}` });
      }
      results.shopify = { success: result.success, message: result.message };
    } else if (meaning === 'cancel') {
      const result = await cancelShopifyOrder(store, orderId);
      if (result.success) {
        await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, order_number: orderNumber, channel, action: 'shopify_order_cancelled', message: result.message });
      } else {
        await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, order_number: orderNumber, channel, action: 'shopify_order_cancelled', message: `Shopify cancel failed: ${result.message}` });
      }
      results.shopify = { success: result.success, message: result.message };
    }
  }

  const sessionEnabled = services.isActive('session_template');
  if (sessionEnabled) {
    const sessionResult = await sendSessionWhatsApp(store, orderId, meaning, channel);
    results.session = { success: sessionResult.success, message: sessionResult.message };
  }

  return results;
};