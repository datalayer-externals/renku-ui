import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.{js,jsx,ts,tsx}",
  },
  env: {
    CLOUD_STORAGE_READWRITE_ENABLED: false,
  },
  retries: {
    runMode: 2,
    openMode: 0,
  },
  video: false,
  viewportWidth: 1600,
  viewportHeight: 1200,
});
