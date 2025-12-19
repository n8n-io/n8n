import { defineWorkspace } from 'vitest/config';

export default defineWorkspace(['packages/**/vite.config.{js,ts,mjs,mts}', 'packages/**/vitest.config.{js,ts,mjs,mts}']);
