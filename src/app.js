// src/app.js
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const sequelize = require('./config/db');


// Import Routes
const authRoutes = require('./routes/auth.routes');
const menuRoutes = require('./routes/menu.routes');
const userPermissionRoutes = require('./routes/userPermission.routes');
const templateRoutes = require('./routes/template.routes');
const storeRoutes = require('./routes/store.routes');
const tagRoutes = require('./routes/tag.routes');
const roleRoutes = require('./routes/role.routes');
const userRoutes = require('./routes/user.routes');
const whatsappCallbackRoutes = require('./routes/whatsappCallback.routes');
const messageLogRoutes = require('./routes/messageLog.routes');

fastify.register(cors, { origin: '*' });
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(menuRoutes, { prefix: '/api/menu' });
fastify.register(userPermissionRoutes, { prefix: '/api/permission' });
fastify.register(templateRoutes, { prefix: '/api/template' });
fastify.register(storeRoutes, { prefix: '/api/store' });
fastify.register(tagRoutes, { prefix: '/api/tag' });
fastify.register(roleRoutes, { prefix: '/api/role' });
fastify.register(userRoutes, { prefix: '/api/user' });
fastify.register(whatsappCallbackRoutes, { prefix: '/api/whatsapp' });
fastify.register(messageLogRoutes, { prefix: '/api/message-log' });

// DB Connection
sequelize.sync({ alter: true })
.then(async () => {
  console.log('✅ Database connected & synced');
})
.catch(err => console.error('❌ DB Error:', err));

module.exports = fastify;
