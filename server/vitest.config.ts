import { defineConfig } from "vitest/config";

// Unit tests only: they mock the database, the queue and the AI SDK, so no server, database or API key is needed
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
