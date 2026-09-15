# Tasker local development

For a new local database, run `npm run db:init` once. This uses local D1 only.
For an existing database, apply only the missing SQL migrations in `migrations/`;
`schema.sql` does not upgrade existing tables. Do not apply migrations again
to a database initialized from the current schema.

Run `npm run dev:api` and `npm run dev` in two terminals from this directory.
Open the Vite URL (normally http://localhost:5173). Vite proxies `/api` to
the local Pages Functions server on 127.0.0.1:8788. Both servers are required
for importing and saving notes. No frontend build is required for this workflow.

Run `npm test`, `npm run lint`, and `npm run build` to verify changes.

### Upgrading Obsidian path keys

For databases without `tasks.source_path_key`, apply the corrected
`migrations/0004_obsidian_path_key.sql`. It preserves existing notes, including
duplicates, and leaves their derived keys empty for Unicode-aware matching by
the API on import. Existing duplicate copies remain accessible and editable by
ID; imports reuse the oldest matching note instead of creating another copy.

If the original version of 0004 was already applied (or added the column but
failed to create its unique index), apply only the repair migration:

```bash
npx wrangler d1 execute tasker-db --local --file=./migrations/0005_repair_obsidian_path_keys.sql
```

This resets only derived keys and creates the index if missing. It does not
delete or merge notes, change their paths, or alter their contents. It is safe
to rerun. For production, apply the same repair with `--remote` before deploying
the new API. Avoid imports during the migration/deployment window. Do not rerun
0004 on a database where the column already exists.

Backend regression tests use Node's built-in SQLite module (Node 22.13+).

## Original Vite template documentation

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
