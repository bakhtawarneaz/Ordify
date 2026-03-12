module.exports = {
    apps: [
      {
        name: "notify",
        script: "./src/server.js",
        instances: 1,
        autorestart: true,
        watch: false,
        env_local: {
          NODE_ENV: "local"
        },
        env_development: {
            NODE_ENV: "development"
        },
        env_production: {
          NODE_ENV: "production"
        }
      }
    ]
  };
  