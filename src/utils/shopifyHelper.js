const axios = require('axios');

const getShopifyHeaders = (accessToken) => ({
  'X-Shopify-Access-Token': accessToken,
  'Content-Type': 'application/json',
});

exports.fetchExistingTags = async (store, orderId) => {
  try {
    const response = await axios.get(
      `https://${store.store_id}.myshopify.com/admin/api/2023-01/orders/${orderId}.json`,
      { headers: getShopifyHeaders(store.access_token), timeout: 10000, }
    );
    return response.data.order.tags || '';
  } catch (error) {
    console.error(`Error fetching tags for order ${orderId}:`, error.message);
    return '';
  }
};

exports.addTagToOrder = async (store, orderId, newTag, existingTags = null) => {
  try {
    if (existingTags === null) {
      existingTags = await exports.fetchExistingTags(store, orderId);
    }

    const tagsArray = existingTags ? existingTags.split(',').map(t => t.trim()) : [];

    if (tagsArray.includes(newTag)) {
      return { success: true, message: 'Tag already exists' };
    }

    tagsArray.push(newTag);
    const updatedTags = tagsArray.join(', ');

    await axios.put(
      `https://${store.store_id}.myshopify.com/admin/api/2023-01/orders/${orderId}.json`,
      { order: { id: orderId, tags: updatedTags } },
      { headers: getShopifyHeaders(store.access_token), timeout: 10000 }
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
      { headers: getShopifyHeaders(store.access_token), timeout: 10000, }
    );
    return response.data.order;
  } catch (error) {
    console.error(`Error fetching order ${orderId}:`, error.message);
    return null;
  }
};

exports.captureOrderPayment = async (store, orderId) => {
  try {
    const orderDetails = await exports.getOrderDetails(store, orderId);
    if (!orderDetails) {
      return { success: false, message: 'Order not found on Shopify' };
    }

    if (orderDetails.financial_status === 'paid') {
      return { success: true, message: 'Order already paid', already_paid: true };
    }

    if (orderDetails.financial_status === 'voided' || orderDetails.cancelled_at) {
      return { success: false, message: 'Order already cancelled/voided' };
    }

    const transactions = await axios.get(
      `https://${store.store_id}.myshopify.com/admin/api/2023-01/orders/${orderId}/transactions.json`,
      { headers: getShopifyHeaders(store.access_token), timeout: 10000 }
    );

    const authTransaction = transactions.data.transactions?.find(
      t => t.kind === 'authorization' && t.status === 'success'
    );

    if (authTransaction) {
      const captureResponse = await axios.post(
        `https://${store.store_id}.myshopify.com/admin/api/2023-01/orders/${orderId}/transactions.json`,
        {
          transaction: {
            kind: 'capture',
            parent_id: authTransaction.id,
            amount: orderDetails.total_price,
            currency: orderDetails.currency,
          },
        },
        { headers: getShopifyHeaders(store.access_token), timeout: 10000 }
      );
      return { success: true, message: 'Payment captured', data: captureResponse.data };
    }

    return { success: true, message: 'No authorization to capture (COD order)', cod: true };
  } catch (error) {
    console.error(`Error capturing payment for order ${orderId}:`, error.message);
    return { success: false, message: error.message };
  }
};

exports.cancelShopifyOrder = async (store, orderId) => {
  try {
    const orderDetails = await exports.getOrderDetails(store, orderId);
    if (!orderDetails) {
      return { success: false, message: 'Order not found on Shopify' };
    }

    if (orderDetails.cancelled_at) {
      return { success: true, message: 'Order already cancelled', already_cancelled: true };
    }

    const response = await axios.post(
      `https://${store.store_id}.myshopify.com/admin/api/2023-01/orders/${orderId}/cancel.json`,
      { reason: 'customer', email: false },
      { headers: getShopifyHeaders(store.access_token), timeout: 10000 }
    );

    return { success: true, message: 'Order cancelled on Shopify', data: response.data };
  } catch (error) {
    console.error(`Error cancelling order ${orderId}:`, error.message);
    return { success: false, message: error.message };
  }
};