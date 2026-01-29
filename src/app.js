// src/app.js
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const sequelize = require('./config/db');
const { seedRoles } = require('./utils/roleSeeder');

// Import Routes
const authRoutes = require('./routes/auth.routes');
const menuRoutes = require('./routes/menu.routes');
const userPermissionRoutes = require('./routes/userPermission.routes');
const chatbotFlowRoutes = require('./routes/chatbotFlow.routes');
const flowNodeRoutes = require('./routes/flowNode.routes');
const flowConnectionRoutes = require('./routes/flowConnection.routes');
const chatbotSessionRoutes = require('./routes/chatbotSession.routes');

fastify.register(cors, { origin: '*' });
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(menuRoutes, { prefix: '/api/menu' });
fastify.register(userPermissionRoutes, { prefix: '/api/permission' });
fastify.register(chatbotFlowRoutes, { prefix: '/api/chatbotFlow' });
fastify.register(flowNodeRoutes, { prefix: '/api/chatbotNode' });
fastify.register(flowConnectionRoutes, { prefix: '/api/chatbotConnection' });
fastify.register(chatbotSessionRoutes, { prefix: '/api/chatbotSession' });

// DB Connection
sequelize.sync({ alter: true })
.then(async () => {
  console.log('✅ Database connected & synced');
  await seedRoles();
})
.catch(err => console.error('❌ DB Error:', err));

module.exports = fastify;
