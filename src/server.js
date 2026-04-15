const app = require('./app');
const sequelize = require('./config/db');
require('dotenv').config();
require('./workers/notification.worker');
require('./workers/feedback.worker');
require('./workers/reattempt.worker');
require('./workers/abandonedCartReminder.worker');
require('./workers/abandonedCartSync.worker');
const { connection } = require('./config/queue');
const PORT = process.env.PORT || 8080;

const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
  try {
    await app.close();
    console.log('✅ Server closed — no new requests accepted');
    await sequelize.close();
    console.log('✅ Database connections closed');
    await connection.quit();
    console.log('✅ Redis connection closed');
    console.log('👋 Shutdown complete. Goodbye!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); 
process.on('SIGINT', () => gracefulShutdown('SIGINT'));  


process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});


const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

start();
