import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "src-tauri/target/**",
      "src-tauri/gen/**",
      "**/*.config.js",
      "**/*.config.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "vite.config.ts"],
    languageOptions: {
      globals: {
        AbortController: "readonly",
        Blob: "readonly",
        CanvasRenderingContext2D: "readonly",
        ChangeEvent: "readonly",
        clearInterval: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        crypto: "readonly",
        document: "readonly",
        Event: "readonly",
        File: "readonly",
        FileReader: "readonly",
        FormData: "readonly",
        HTMLButtonElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLSelectElement: "readonly",
        HTMLTextAreaElement: "readonly",
        Image: "readonly",
        KeyboardEvent: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        process: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
        TextEncoder: "readonly",
        URL: "readonly",
        window: "readonly",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
      },
    },
  }
);
