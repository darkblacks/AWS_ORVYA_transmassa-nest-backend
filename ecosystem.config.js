module.exports = {
  apps: [
    {
      name: "transmassa-nest-api",
      script: "dist/src/main.js",
      cwd: "/home/ubuntu/transmassa-nest-backend",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_memory_restart: "600M",
      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
}
