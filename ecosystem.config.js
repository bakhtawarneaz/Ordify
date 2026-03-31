module.exports = {
  apps: [
    {
      name: 'notify',
      script: './src/server.js',
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
      autorestart: true,
      watch: process.env.NODE_ENV !== 'production', 
      max_memory_restart: '500M', 
      env: {
        NODE_ENV: 'development',
        PORT: 8080,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      error_file: './pm2-logs/error.log',
      out_file: './pm2-logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,           
      listen_timeout: 10000,       
      shutdown_with_message: true,
      max_restarts: 10,             
      restart_delay: 4000,          
      exp_backoff_restart_delay: 100, 
    },
  ],
};
