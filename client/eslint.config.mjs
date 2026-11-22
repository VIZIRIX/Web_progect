import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        ignores: ["dist", "node_modules", "eslint.config.mjs"],
    },
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                alert: "readonly",
                confirm: "readonly",
                console: "readonly",
                document: "readonly",
                fetch: "readonly",
                localStorage: "readonly",
                Number: "readonly",
                setTimeout: "readonly",
                URLSearchParams: "readonly",
                window: "readonly",
            },
        },
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "no-undef": "off",
            "no-console": "off",
        },
    },
]);
