const axios = require('axios');
const FormData = require('form-data');

exports.getProductImage = async (store, orderData, wtApiToken) => {
  try {
    const lineItems = orderData?.line_items || [];

    if (lineItems.length === 0) {
      return { imageUrl: null, mediaId: null };
    }

    const productId = lineItems[0]?.product_id;
    if (!productId) {
      return { imageUrl: null, mediaId: null };
    }

    const imgRes = await axios.get(
      `https://${store.store_id}.myshopify.com/admin/api/2024-01/products/${productId}/images.json`,
      {
        headers: { 'X-Shopify-Access-Token': store.access_token },
        timeout: 10000,
      }
    );

    let productImageUrl = imgRes.data?.images?.[0]?.src || null;

    if (!productImageUrl) {
      return { imageUrl: null, mediaId: null };
    }

    const url = new URL(productImageUrl);
    url.searchParams.set('format', 'jpg');
    const jpgUrl = url.toString();

    const imageResponse = await axios.get(jpgUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    const formData = new FormData();
    formData.append('template_upload', 'true');
    formData.append('file', Buffer.from(imageResponse.data), {
      filename: 'product-image.jpg',
      contentType: 'image/jpeg',
    });

    const uploadRes = await axios.post(
      'https://waba-be-whatsapp.its.com.pk/v1/upload',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'xt-user-token': wtApiToken,
        },
        timeout: 15000,
      }
    );

    const mediaId = uploadRes.data?.data?.upload_media_id || null;
    const uploadedUrl = uploadRes.data?.data?.link || productImageUrl; 

    return { imageUrl: uploadedUrl, mediaId };
  } catch (error) {
    console.error('Error fetching product image:', error.message);
    return { imageUrl: null, mediaId: null };
  }
};