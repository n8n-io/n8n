import path from 'path';
import shell from 'shelljs';
import glob from 'tiny-glob';
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
 * Clean up
 */

shell.rm('-rf', distDir);

/**
 * Build
 */

const tsFiles = await glob(path.resolve(rootDir, '@(credentials|nodes|src)/**/*!(.d).ts'));

esbuild.build({
	entryPoints: tsFiles,
	format: 'cjs',
	outdir: path.resolve(distDir),
	watch: watchMode,
	sourcemap: !watchMode
}).then(() => {
	console.log('\n[esbuild] Watching for changes...')
}).catch((error) => {
	console.error('[esbuild] An unexpected error has occurred!', error);
	process.exit(1);
});
