const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: isProduction ? false : console.log,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 20,    
      min: parseInt(process.env.DB_POOL_MIN) || 5,      
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,  
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,        
    },
    ...(isProduction && {
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    }),
    retry: {
      max: 3,
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
      ],
    },
    timezone: '+05:00', 
    define: {
      timestamps: true,
    },
  }
);

sequelize.testConnection = async function () {
  try {
    await sequelize.authenticate();
    return { status: 'healthy', message: 'Database connection is active' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
};

module.exports = sequelize;
