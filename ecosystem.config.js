// PM2 配置文件 - 用于生产环境部署
module.exports = {
  apps: [{
    name: 'camp-pk-system',
    script: 'server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 3004
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3004,
      // 可选：设置管理员密码
      // ADMIN_PIN: '你的密码'
    },
    // 日志配置
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    // 优雅重启
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
