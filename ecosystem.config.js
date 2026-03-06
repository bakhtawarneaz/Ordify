module.exports = {
    apps: [
      {
        name: "notify",
        script: "./src/server.js",
        env: {
          PORT: 8080,           // Node internal port
          NODE_ENV: "production"
        },
        watch: false
      }
    ]
  };
  