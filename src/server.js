const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 8080; 

const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
