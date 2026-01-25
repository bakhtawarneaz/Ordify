const Role = require('../models/role.model');

async function seedRoles() {
  try {
    const defaultRoles = ['admin', 'client'];

    for (const roleName of defaultRoles) {
      const existing = await Role.findOne({ where: { name: roleName } });
      if (!existing) {
        await Role.create({ name: roleName });
        console.log(`✅ Role "${roleName}" created`);
      }
    }

    console.log('✅ Role seeding completed');
  } catch (error) {
    console.error('❌ Role seeding failed:', error);
  }
}

module.exports = { seedRoles };
