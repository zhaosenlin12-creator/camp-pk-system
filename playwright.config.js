const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  use: {
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || undefined
  }
});
