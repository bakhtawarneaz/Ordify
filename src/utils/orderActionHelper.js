const { captureOrderPayment, cancelShopifyOrder } = require('./shopifyHelper');
const { isServiceActive } = require('../services/storeSetting.service');
const { logSuccess, logFailed } = require('./loggerHelper');
const { sendSessionWhatsApp } = require('./sessionHelper');
const { findAndApplyTag } = require('./tagHelper');

exports.handlePostCallbackActions = async (store, orderId, meaning, channel, existingTagsString, extraLog = {}) => {
  const results = {
    tag: null,
    shopify: null,
    session: null,
  };

  // Tagging 
  const taggingActive = await isServiceActive(store.id, 'tagging');
  if (taggingActive) {
    const tagResult = await findAndApplyTag(store, orderId, meaning, channel, existingTagsString);
    if (tagResult.success) {
      await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'tag_added', message: `Tag "${tagResult.tag}" added`, details: { tag: tagResult.tag, meaning, ...extraLog } });
    } else {
      await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'tag_added', message: `Tag failed: ${tagResult.message}`, details: { meaning, ...extraLog } });
    }
    results.tag = tagResult;
  } else {
    await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'tag_skipped', message: 'Tagging not enabled for this store' });
    results.tag = { success: true, skipped: true };
  }

  //  Shopify order action
  const shopifyActionActive = await isServiceActive(store.id, 'shopify_order_action');
  if (shopifyActionActive) {
    if (meaning === 'confirm') {
      const result = await captureOrderPayment(store, orderId);
      if (result.success) {
        await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'shopify_order_confirmed', message: result.message });
      } else {
        await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'shopify_order_confirmed', message: `Shopify confirm failed: ${result.message}` });
      }
      results.shopify = result;
    } else if (meaning === 'cancel') {
      const result = await cancelShopifyOrder(store, orderId);
      if (result.success) {
        await logSuccess({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'shopify_order_cancelled', message: result.message });
      } else {
        await logFailed({ store_id: store.id, store_name: store.store_name, order_id: orderId, channel, action: 'shopify_order_cancelled', message: `Shopify cancel failed: ${result.message}` });
      }
      results.shopify = result;
    }
  } else {
    results.shopify = { success: true, skipped: true };
  }

  // Session template WhatsApp 
  const sessionResult = await sendSessionWhatsApp(store, orderId, meaning, channel);
  results.session = sessionResult;

  return results;
};