import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['{credentials,nodes,types,utils}/**/*.ts', '!**/*.d.ts', '!**/*.test.ts'],
	format: ['cjs'],
	clean: true,
	dts: false,
	cjsInterop: true,
	sourcemap: false,
	splitting: false,
	minify: true,
	external: ['cpufeatures', 'ssh2'],
});
