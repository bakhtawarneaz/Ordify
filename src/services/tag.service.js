const Tag = require('../models/tag.model');

exports.createTag = async (payload) => {
  const { store_id, name, color } = payload;

  if (!store_id || !name) {
    return { success: false, message: 'store_id and name are required' };
  }

  const exists = await Tag.findOne({ where: { store_id, name } });
  if (exists) {
    return { success: false, message: 'Tag already exists for this store' };
  }

  const tag = await Tag.create({
    store_id,
    name,
    color: color || null,
  });

  return { success: true, message: 'Tag created successfully', data: tag };
};

exports.updateTag = async (id, payload) => {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    return { success: false, message: 'Tag not found' };
  }

  await tag.update(payload);
  return { success: true, message: 'Tag updated successfully', data: tag };
};

exports.deleteTag = async (id) => {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    return { success: false, message: 'Tag not found' };
  }

  await tag.destroy();
  return { success: true, message: 'Tag deleted successfully' };
};

exports.getTagById = async (id) => {
  const tag = await Tag.findByPk(id);
  if (!tag) {
    return { success: false, message: 'Tag not found' };
  }

  return { success: true, data: tag };
};

exports.getAllTags = async (store_id) => {
    const where = {};
  
    if (store_id) {
      where.store_id = store_id;
    }
  
    const tags = await Tag.findAll({
      where,
      order: [['id', 'ASC']],
    });
  
    return { success: true, data: tags };
};