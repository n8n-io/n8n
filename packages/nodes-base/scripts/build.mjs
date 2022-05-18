import path from 'path';
import glob from 'fast-glob';
import esbuild from 'esbuild';
import {fileURLToPath} from 'url';

/**
 * Configuration
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const watchMode = process.argv[2] === '--watch';
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

/**
 * Build
 */

const tsFiles = await glob([path.resolve(rootDir, '{credentials,nodes,src}/**/*.ts'), '!*.d.ts']);

esbuild.build({
	entryPoints: tsFiles,
	format: 'cjs',
	outdir: path.resolve(distDir),
	watch: watchMode,
	sourcemap: !watchMode,
	banner: {
		js: '\'use strict\';\n'
	}
}).then(() => {
	if (watchMode) {
		console.log('\n[esbuild] Watching for changes...')
	} else {
		console.log(`\n[esbuild] Building ${tsFiles.length} files...`)
	}
}).catch((error) => {
	console.error('[esbuild] An unexpected error has occurred!', error);
	process.exit(1);
});
