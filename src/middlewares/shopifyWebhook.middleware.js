const crypto = require('crypto');
const Store = require('../models/store.model');
const { Op } = require('sequelize');

exports.verifyShopifyWebhook = async (req, reply) => {

  if (process.env.NODE_ENV === 'development') {
    return;
  }
  
  try {
    const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    const shopDomain = req.headers['x-shopify-shop-domain'] || '';

    if (!hmacHeader) {
      return reply.code(401).send({ success: false, message: 'Missing HMAC header' });
    }

    if (!shopDomain) {
      return reply.code(401).send({ success: false, message: 'Missing shop domain' });
    }

    const store = await Store.findOne({
      where: { store_url: { [Op.like]: `%${shopDomain}%` }, status: true },
    });

    if (!store || !store.client_secret) {
      return reply.code(401).send({ success: false, message: 'Store not found or secret missing' });
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);
    const generatedHmac = crypto
      .createHmac('sha256', store.client_secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(hmacHeader),
      Buffer.from(generatedHmac)
    );

    if (!isValid) {
      return reply.code(401).send({ success: false, message: 'Invalid webhook signature' });
    }

    req.verifiedStore = store;

  } catch (error) {
    console.error('HMAC verification error:', error.message);
    return reply.code(401).send({ success: false, message: 'Webhook verification failed' });
  }
};