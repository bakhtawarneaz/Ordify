const axios = require('axios');

const getShopifyHeaders = (accessToken) => ({
  'X-Shopify-Access-Token': accessToken,
  'Content-Type': 'application/json',
});

exports.fetchExistingTags = async (store, orderId) => {
  try {
    const response = await axios.get(
      `https://${store.store_id}.myshopify.com/admin/api/2023-01/orders/${orderId}.json`,
      { headers: getShopifyHeaders(store.access_token) }
    );
    return response.data.order.tags || '';
  } catch (error) {
    console.error(`Error fetching tags for order ${orderId}:`, error.message);
    return '';
  }
};

exports.addTagToOrder = async (store, orderId, newTag) => {
  try {
    const existingTags = await exports.fetchExistingTags(store, orderId);
    const tagsArray = existingTags ? existingTags.split(',').map(t => t.trim()) : [];

    if (tagsArray.includes(newTag)) {
      return { success: true, message: 'Tag already exists' };
    }

    tagsArray.push(newTag);
    const updatedTags = tagsArray.join(', ');

    await axios.put(
      `https://${store.store_id}.myshopify.com/admin/api/2023-01/orders/${orderId}.json`,
      { order: { id: orderId, tags: updatedTags } },
      { headers: getShopifyHeaders(store.access_token) }
    );

    return { success: true, message: `Tag "${newTag}" added successfully` };
  } catch (error) {
    console.error(`Error adding tag to order ${orderId}:`, error.message);
    return { success: false, message: error.message };
  }
};

exports.getOrderDetails = async (store, orderId) => {
  try {
    const response = await axios.get(
      `https://${store.store_id}.myshopify.com/admin/api/2023-01/orders/${orderId}.json`,
      { headers: getShopifyHeaders(store.access_token) }
    );
    return response.data.order;
  } catch (error) {
    console.error(`Error fetching order ${orderId}:`, error.message);
    return null;
  }
};