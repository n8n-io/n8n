import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'tsdown';

function git(args: string[]): string {
	try {
		return execFileSync('git', args, { cwd: import.meta.dirname, encoding: 'utf8' }).trim();
	} catch {
		return '';
	}
}

const packageJson: { version: string } = JSON.parse(
	readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);
// Uncommitted changes to rig make a build different from its commit.
const dirty = git(['status', '--porcelain', '--', '.']).length > 0;

const build = {
	version: packageJson.version,
	commit: git(['rev-parse', '--short=10', 'HEAD']) || 'unknown',
	dirty,
	builtAt: new Date().toISOString(),
};

/**
 * One self-contained file for the global install. `typescript` stays out: the
 * env catalog loads it from the n8n checkout that it reads.
 */
export default defineConfig({
	entry: { rig: 'src/cli.ts' },
	format: 'esm',
	platform: 'node',
	target: 'node22',
	outDir: 'dist',
	clean: true,
	dts: false,
	fixedExtension: true,
	deps: { alwaysBundle: [/.*/], neverBundle: ['typescript'], onlyBundle: false },
	define: { __RIG_BUILD__: JSON.stringify(build) },
	outputOptions: { codeSplitting: false },
	banner: { js: '#!/usr/bin/env node' },
	hooks: {
		// `rig install-global` reads the version id from this file.
		'build:done': (context) => {
			writeFileSync(join(context.options.outDir, 'build.json'), `${JSON.stringify(build)}\n`);
		},
	},
});
