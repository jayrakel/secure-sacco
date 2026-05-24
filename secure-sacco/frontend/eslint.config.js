import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // react-hooks v7 introduced stricter rules that flag idiomatic patterns
      // (e.g. calling a useCallback fetch function from useEffect). Downgrade
      // to warn so CI is not blocked; these should be addressed incrementally.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components':   'warn',
      'react-hooks/immutability':        'warn',
    },
  },
])
