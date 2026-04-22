const Store = require('./store.model');
const StoreSetting = require('./storeSetting.model');
const Order = require('./order.model');
const Template = require('./template.model');
const User = require('./user.model');
const Role = require('./role.model');
const Menu = require('./menu.model');
const UserMenuPermission = require('./userMenuPermission.model');
const AbandonedCheckout = require('./abandonedCheckout.model');
const AbandonedCartTemplate = require('./abandonedCartTemplate.model');
const AbandonedCartStoreConfig = require('./abandonedCartStoreConfig.model');
const AbandonedCartReminder = require('./abandonedCartReminder.model');
const AbandonedCartMessageLog = require('./abandonedCartMessageLog.model');

// ============================================
// Store ↔ StoreSetting
// ============================================
Store.hasMany(StoreSetting, { foreignKey: 'store_id' });
StoreSetting.belongsTo(Store, { foreignKey: 'store_id' });

// ============================================
// Store ↔ Order
// ============================================
Store.hasMany(Order, { foreignKey: 'store_id' });
Order.belongsTo(Store, { foreignKey: 'store_id' });

// ============================================
// Store ↔ Template
// ============================================
Store.hasMany(Template, { foreignKey: 'store_id' });
Template.belongsTo(Store, { foreignKey: 'store_id' });

// ============================================
// User ↔ Role
// ============================================
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User, { foreignKey: 'role_id' });

// ============================================
// User ↔ Menu (through UserMenuPermission)
// ============================================
UserMenuPermission.belongsTo(User, { foreignKey: 'user_id' });
UserMenuPermission.belongsTo(Menu, { foreignKey: 'menu_id' });
User.hasMany(UserMenuPermission, { foreignKey: 'user_id' });
Menu.hasMany(UserMenuPermission, { foreignKey: 'menu_id' });

// ============================================
// Store ↔ AbandonedCheckout
// ============================================
Store.hasMany(AbandonedCheckout, { foreignKey: 'store_id' });
AbandonedCheckout.belongsTo(Store, { foreignKey: 'store_id' });

// ============================================
// Store ↔ AbandonedCartTemplate
// ============================================
Store.hasMany(AbandonedCartTemplate, { foreignKey: 'store_id' });
AbandonedCartTemplate.belongsTo(Store, { foreignKey: 'store_id' });

// ============================================
// Store ↔ AbandonedCartStoreConfig
// ============================================
Store.hasOne(AbandonedCartStoreConfig, { foreignKey: 'store_id' });
AbandonedCartStoreConfig.belongsTo(Store, { foreignKey: 'store_id' });

// ============================================
// AbandonedCartReminder associations
// ============================================
AbandonedCartReminder.belongsTo(Store, { foreignKey: 'store_id' });
AbandonedCartReminder.belongsTo(AbandonedCheckout, { foreignKey: 'abandoned_checkout_id' });
AbandonedCartReminder.belongsTo(AbandonedCartTemplate, { foreignKey: 'template_id' });

Store.hasMany(AbandonedCartReminder, { foreignKey: 'store_id' });
AbandonedCheckout.hasMany(AbandonedCartReminder, { foreignKey: 'abandoned_checkout_id' });
AbandonedCartTemplate.hasMany(AbandonedCartReminder, { foreignKey: 'template_id' });

// ============================================
// AbandonedCartMessageLog associations
// ============================================
AbandonedCartMessageLog.belongsTo(Store, { foreignKey: 'store_id' });
AbandonedCartMessageLog.belongsTo(AbandonedCheckout, { foreignKey: 'abandoned_checkout_id' });
AbandonedCartMessageLog.belongsTo(AbandonedCartReminder, { foreignKey: 'reminder_id' });
AbandonedCartMessageLog.belongsTo(AbandonedCartTemplate, { foreignKey: 'template_id' });

Store.hasMany(AbandonedCartMessageLog, { foreignKey: 'store_id' });
AbandonedCheckout.hasMany(AbandonedCartMessageLog, { foreignKey: 'abandoned_checkout_id' });
AbandonedCartReminder.hasMany(AbandonedCartMessageLog, { foreignKey: 'reminder_id' });
AbandonedCartTemplate.hasMany(AbandonedCartMessageLog, { foreignKey: 'template_id' });

module.exports = {
  Store,
  StoreSetting,
  Order,
  Template,
  User,
  Role,
  Menu,
  UserMenuPermission,
  AbandonedCheckout,
  AbandonedCartTemplate,
  AbandonedCartStoreConfig,
  AbandonedCartReminder,
  AbandonedCartMessageLog,
};