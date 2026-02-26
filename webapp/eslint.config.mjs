import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
    {
        ignores: [".next/", "node_modules/", "dist/", "coverage/", "*.config.js", "*.config.mjs"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["src/**/*.ts", "src/**/*.tsx"],
        plugins: {
            react,
            "react-hooks": reactHooks,
            "@next/next": nextPlugin,
            "jsx-a11y": jsxA11y,
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            ...nextPlugin.configs.recommended.rules,
            ...nextPlugin.configs["core-web-vitals"].rules,
            ...jsxA11y.configs.recommended.rules,
            "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
            "@typescript-eslint/no-explicit-any": "warn",
            "no-console": ["warn", { "allow": ["warn", "error"] }],
            "jsx-a11y/click-events-have-key-events": "warn",
            "jsx-a11y/no-static-element-interactions": "warn",
            "jsx-a11y/label-has-associated-control": "warn",
            "jsx-a11y/heading-has-content": "warn",
            "jsx-a11y/media-has-caption": "warn",
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    }
);
