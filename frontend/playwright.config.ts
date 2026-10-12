import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    viewport: { width: 1440, height: 1000 },
  },
  reporter: "list",
});
