const axios = require('axios');
const WHATSAPP_API_URL = 'https://waba-be-whatsapp.its.com.pk/v1/template/message';
const { extractPhoneFromOrder } = require('./phoneHelper');

const buildParameters = (textParameters, order) => {
  const customerName = `${order?.billing_address?.first_name || ''} ${order?.billing_address?.last_name || ''}`.trim();
  const orderNumber = order?.name || order?.order_number;
  const totalAmount = order?.total_price || '0.00';
  const customerAddress = order?.shipping_address?.address1 || order?.shipping_address?.address2 || 'N/A';
  const lineItems = order?.line_items || [];
  const productNames = lineItems.map(item => item.name).join(', ');
  const productQuantities = lineItems.map(item => item.quantity).toString();
  const productPrices = lineItems.map(item => item.price).join(', ');
  const customerPhone = order?.billing_address?.phone || order?.customer?.phone || '';
  const gatewayName = order?.payment_gateway_names?.[0] || 'N/A';
  const city = order?.billing_address?.city || '';
  const vendor = order?.line_items?.[0]?.vendor || '';
  const orderDate = new Date(order?.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const shippingLine = (order?.shipping_lines || []).find(line => line.code === 'STANDARD DELIVERY');
  const deliveryCharge = shippingLine ? shippingLine.price : '0.00';
  const fulfillment = order?.fulfillments?.[order.fulfillments.length - 1] || {};
  const trackingNumber = fulfillment.tracking_number || '';
  const trackingUrl = fulfillment.tracking_url || '';
  const trackingCompany = fulfillment.tracking_company || '';

  const valueMap = {
    customer_name: customerName,
    name: customerName,
    order_number: orderNumber,
    number: orderNumber,
    order_id: orderNumber,
    order_date: orderDate,
    total_amount: totalAmount,
    total_price: totalAmount,
    deposit: totalAmount,
    customer_address: customerAddress,
    products: productNames,
    item_name: productNames,
    product_name: productNames,
    items: productNames,
    quantity: productQuantities,
    amount: productPrices,
    delivery_charges: deliveryCharge,
    bank_account: gatewayName,
    customer_phone: customerPhone,
    closing_note: 'Happy Shopping',
    outlet_name: vendor,
    city: city,
    tracking_number: trackingNumber,
    tracking_link: trackingUrl,
    tracking_url: trackingUrl,
    courier: trackingCompany,
    courier_name: trackingCompany,
    tracking_company: trackingCompany,
  };

  return textParameters.map(param => {
    const key = (param.paramName || param.sampleValue || '').toLowerCase().trim();
    return {
      paramName: param.paramName || null,
      sampleValue: param.sampleValue,
      value: valueMap[key] || '',
    };
  });
};

exports.sendWhatsAppMessage = async (order, template, store, phoneNumber = null) => {
  try {
    let supportedNumber = phoneNumber;
    if (!supportedNumber) {
      supportedNumber = extractPhoneFromOrder(order);
    }

    const textParameters = typeof template.body_text_parameters === 'string'
      ? JSON.parse(template.body_text_parameters || '[]')
      : template.body_text_parameters || [];
    const parameters = buildParameters(textParameters, order);

    const payload = {
      clientId: template.client_id,
      template_message_id: template.template_message_id,
      numbers: supportedNumber,
      template_params: {
        ...(template.header_value || template.header_sample_value
          ? {
              header: {
                type: 'HEADER',
                format: template.header_format || 'IMAGE',
                value: template.header_value || 'Not Available',
                sampleValue: template.header_sample_value || 'Not Available',
                ...(template.upload_media_id && { upload_media_id: template.upload_media_id }),
              },
            }
          : {}),
        body: {
          type: 'BODY',
          text: template.body_text,
          parameters,
        },
        ...(template.buttons && template.buttons.length > 0 && {
          buttons: template.buttons.map(btn => ({
            text: btn.text,
            sub_type: btn.sub_type,
            ...(btn.sub_type === 'URL' && {
              url: btn.url,
              value: `${store.store_id}/${order.id}`,
              sampleValue: btn.sampleValue || '',
            }),
          })),
        }),
      },
    };

    const response = await axios.post(WHATSAPP_API_URL, payload, {
      headers: {
        accept: 'application/json',
        'content-type': 'application/json;charset=UTF-8',
        'xt-user-token': template.wt_api,
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message);
    return { success: false, error: error?.response?.data?.message || error?.response?.data?.error || error.message  };
  }
};