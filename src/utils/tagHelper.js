const Tag = require('../models/tag.model');
const { fetchExistingTags, addTagToOrder } = require('./shopifyHelper');

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

exports.findAndApplyTag = async (store, orderId, meaning, channel) => {
  const tag = await Tag.findOne({
    where: { store_id: store.id, meaning, channel },
  });
  if (!tag) {
    return { success: false, message: `No ${meaning} tag found for ${channel}` };
  }
  await addTagToOrder(store, orderId, tag.name);
  return { success: true, message: 'Tag added', tag: tag.name };
};