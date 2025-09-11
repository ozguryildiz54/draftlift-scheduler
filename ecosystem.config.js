// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "draftlift",
      script: "app.js",
      env: { NODE_ENV: "production" },
      max_memory_restart: "300M",
      out_file: "logs/app-out.log",
      error_file: "logs/app-err.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
