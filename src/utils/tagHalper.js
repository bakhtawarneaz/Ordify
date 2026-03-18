const Tag = require('../models/tag.model');
const { fetchExistingTags, addTagToOrder } = require('../utils/shopifyHelper');

// Check if any of our tags already exist on this order
exports.hasExistingTag = async (store, orderId) => {
  const existingTagsString = await fetchExistingTags(store, orderId);
  const shopifyTags = existingTagsString
    ? existingTagsString.split(',').map(t => t.trim().toLowerCase())
    : [];

  const storeTags = await Tag.findAll({ where: { store_id: store.id } });
  const ourTagNames = storeTags.map(t => t.name.toLowerCase());
  const hasOurTag = ourTagNames.some(tag => shopifyTags.includes(tag));

  return { hasOurTag, shopifyTags, storeTags };
};

// Find tag by meaning (confirm/cancel etc) and add to Shopify
exports.findAndApplyTag = async (store, orderId, meaning) => {
  const storeTags = await Tag.findAll({ where: { store_id: store.id } });
  const tagToApply = storeTags.find(t => t.name.toLowerCase().includes(meaning));

  if (!tagToApply) {
    return { success: false, message: `No ${meaning} tag found for this store` };
  }

  await addTagToOrder(store, orderId, tagToApply.name);
  return { success: true, message: `Tag "${tagToApply.name}" added`, tag: tagToApply.name };
};