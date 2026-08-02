module.exports = {
  apps: [
    {
      name: 'validation-api',
      script: 'dist/index.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001,
      },
    },
  ],
};
