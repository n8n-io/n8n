import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
	plugins: [dts({ rollupTypes: true, tsconfigPath: './tsconfig.build.json' })],
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'N8nWorkflow',
			fileName: 'n8n-workflow',
		},
	},
	test: {
		include: ['test/**/*.test.ts'],
		exclude: [],
		globals: true,
		alias: [{ find: /^@\/(.*)/, replacement: 'src/$1' }],
	},
});
