const { captureOrderPayment, cancelShopifyOrder } = require('./shopifyHelper');
const { isServiceActive } = require('../services/storeSetting.service');
const { logSuccess, logFailed } = require('./loggerHelper');
const { sendSessionWhatsApp } = require('./sessionHelper');
const { findAndApplyTag } = require('./tagHelper');

exports.handlePostCallbackActions = async (store, orderId, meaning, channel, existingTagsString, extraLog = {}) => {
  const results = {};

  const taggingActive = await isServiceActive(store.id, 'tagging');
  if (taggingActive) {
    const tagResult = await findAndApplyTag(store, orderId, meaning, channel, existingTagsString);
    if (tagResult.success) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'tag_added', message: `Tag "${tagResult.tag}" added`, details: { tag: tagResult.tag, meaning, ...extraLog } });
      results.tag = { success: true, message: `Tag "${tagResult.tag}" added` };
    } else {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'tag_added', message: `Tag failed: ${tagResult.message}`, details: { meaning, ...extraLog } });
      results.tag = { success: false, message: tagResult.message };
    }
  } else {
    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'tag_skipped', message: 'Tagging not enabled for this store' });
    results.tag = { success: true, message: 'Tagging not enabled for this store' };
  }

  const shopifyActionActive = await isServiceActive(store.id, 'shopify_order_action');
  if (shopifyActionActive) {
    if (meaning === 'confirm') {
      const result = await captureOrderPayment(store, orderId);
      if (result.success) {
        await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'shopify_order_confirmed', message: result.message });
      } else {
        await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'shopify_order_confirmed', message: `Shopify confirm failed: ${result.message}` });
      }
      results.shopify = { success: result.success, message: result.message };
    } else if (meaning === 'cancel') {
      const result = await cancelShopifyOrder(store, orderId);
      if (result.success) {
        await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'shopify_order_cancelled', message: result.message });
      } else {
        await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'shopify_order_cancelled', message: `Shopify cancel failed: ${result.message}` });
      }
      results.shopify = { success: result.success, message: result.message };
    }
  }

  const sessionEnabled = await isServiceActive(store.id, 'session_template');
  if (sessionEnabled) {
    const sessionResult = await sendSessionWhatsApp(store, orderId, meaning, channel);
    results.session = { success: sessionResult.success, message: sessionResult.message };
  }

  return results;
};