import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "cli/**/test/**/*.test.ts",
      "cli/ai-sdlc/templates/stacks/**/test/**/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "cli/ai-sdlc/templates/stacks/playwright-ts/**",
    ],
  },
});
