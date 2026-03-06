// src/app.js
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const sequelize = require('./config/db');
const { seedRoles } = require('./utils/roleSeeder');

// Import Routes
const authRoutes = require('./routes/auth.routes');
const menuRoutes = require('./routes/menu.routes');
const userPermissionRoutes = require('./routes/userPermission.routes');
const templateRoutes = require('./routes/template.routes');
const storeRoutes = require('./routes/store.routes');
const tagRoutes = require('./routes/tag.routes');

fastify.register(cors, { origin: '*' });
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(menuRoutes, { prefix: '/api/menu' });
fastify.register(userPermissionRoutes, { prefix: '/api/permission' });
fastify.register(templateRoutes, { prefix: '/api/template' });
fastify.register(storeRoutes, { prefix: '/api/store' });
fastify.register(tagRoutes, { prefix: '/api/tag' });

// DB Connection
sequelize.sync({ alter: true })
.then(async () => {
  console.log('✅ Database connected & synced');
  await seedRoles();
})
.catch(err => console.error('❌ DB Error:', err));

module.exports = fastify;
