const storeModel = require('../models/store.model');

exports.add = async (payload) => {
  const { store_id,  store_name , sender, access_token, api_key, whatsapp_only, voice_only, ordify_only, brand_name, judgeme_api_token, voice_unanswered, feedback_delay, voice_unanswered_whatsapp,post_paid, pre_paid } = payload;

  const existing = await storeModel.findOne({
    where: { store_id  },
  });

  if (existing) {
    await existing.update({ store_id,  store_name, sender, access_token, api_key, whatsapp_only,  voice_only, ordify_only, brand_name, judgeme_api_token, voice_unanswered, feedback_delay, voice_unanswered_whatsapp, post_paid, pre_paid  });
    return { success: true, message: 'Store updated' };
  }

  await storeModel.create({
    store_id,
    store_name,
    sender,
    access_token,
    api_key,
    whatsapp_only,
    voice_only, 
    ordify_only,
    brand_name,
    judgeme_api_token,
    voice_unanswered,
    feedback_delay,
    voice_unanswered_whatsapp,
    post_paid,
    pre_paid

    
  });

  return { success: true, message: 'Store added' };
};


// Service function to get all stores
exports.getAllStores = async () => {
  try {
      const stores = await storeModel.findAll(); // Sequelize/ORM or DB query
      return { success: true, data: stores };
  } catch (err) {
      return { success: false, message: err.message };
  }
};

// exports.getByUser = async (user_id) => {
//   const data = await UserMenuPermission.findAll({ where: { user_id } });
//   return { success: true, data };
// };