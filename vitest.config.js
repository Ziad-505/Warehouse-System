import { defineConfig } from "vitest/config";
import { config } from "dotenv";

const { parsed } = config({ path: ".env.test" });

export default defineConfig({
    test: {
        environment: "node",
        env: parsed,
        setupFiles: ["./tests/setup.js"],
        fileParallelism: false,
        testTimeout: 20000,
    },
});