const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    ...(process.env.NODE_ENV === 'production' && {
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            hostname: request.hostname,
            remoteAddress: request.ip,
          };
        },
      },
    }),
  },
  trustProxy: process.env.TRUST_PROXY === 'true',
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
  bodyLimit: parseInt(process.env.BODY_LIMIT) || 1048576, // 1MB default
});

const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');
const sequelize = require('./config/db');

fastify.register(helmet, {
  contentSecurityPolicy: false, 
});

fastify.register(cors, {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
});

fastify.register(require('fastify-raw-body'), {
  runFirst: true,
  routes: ['/api/webhook'],
});

fastify.register(rateLimit, {
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, 
  timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  errorResponseBuilder: function () {
    return {
      success: false,
      message: 'Too many requests. Please try again later.',
      statusCode: 429,
    };
  },
});


fastify.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode || 500;

  request.log.error({
    err: error,
    url: request.url,
    method: request.method,
  });

  reply.status(statusCode).send({
    success: false,
    message:
      statusCode === 500
        ? 'Internal server error' 
        : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
});


fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    success: false,
    message: `Route ${request.method} ${request.url} not found`,
  });
});


fastify.get('/health', async (request, reply) => {
  const dbHealth = await sequelize.testConnection();
  const isHealthy = dbHealth.status === 'healthy';

  reply.status(isHealthy ? 200 : 503).send({
    success: isHealthy,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
    },
    database: dbHealth,
  });
});


// REGISTER ROUTES
fastify.register(require('./routes/auth.routes'), { prefix: '/api/auth' });
fastify.register(require('./routes/menu.routes'), { prefix: '/api/menu' });
fastify.register(require('./routes/userPermission.routes'), { prefix: '/api/permission' });
fastify.register(require('./routes/template.routes'), { prefix: '/api/template' });
fastify.register(require('./routes/store.routes'), { prefix: '/api/store' });
fastify.register(require('./routes/tag.routes'), { prefix: '/api/tag' });
fastify.register(require('./routes/role.routes'), { prefix: '/api/role' });
fastify.register(require('./routes/user.routes'), { prefix: '/api/user' });
fastify.register(require('./routes/retryQueue.routes'), { prefix: '/api/retry-queue' });
fastify.register(require('./routes/whatsappCallback.routes'), { prefix: '/api/whatsapp' });
fastify.register(require('./routes/voiceCallback.routes'), { prefix: '/api/voice' });
fastify.register(require('./routes/ordifyCallback.routes'), { prefix: '/api/ordify' });
fastify.register(require('./routes/storeService.routes'), { prefix: '/api/store-service' });
fastify.register(require('./routes/shopifyWebhook.routes'), { prefix: '/api/webhook' });
fastify.register(require('./routes/activityLog.routes'), { prefix: '/api/activity-log' });
fastify.register(require('./routes/dashboard.routes'), { prefix: '/api/dashboard' });

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('🔄 Retrying database connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

connectDB();

module.exports = fastify;
