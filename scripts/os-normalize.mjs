#!/usr/bin/env node

/**
 * Created to ease the running of binaries on cross-platform teams.
 * Enabled writing startup scripts once, but defaulting to platform specific runners.
 *
 * Usage: node scripts/os-normalize.mjs --dir packages/cli/bin n8n
 * Usage (with args): node scripts/os-normalize.mjs --dir packages/cli/bin -- n8n --help
 * */

import { $, argv, cd, chalk, echo, usePowerShell, fs } from 'zx';

const isWindows = process.platform === 'win32';

/**
 * @param { string } baseName
 * */
function normalizeCommand(baseName) {
	if (!isWindows) {
		return `./${baseName}`;
	}

	const candidates = [`${baseName}.cmd`, `${baseName}.exe`, baseName];
	const found = candidates.find((c) => fs.existsSync(c));
	return found ? `./${found}` : `./${baseName}.cmd`; // last resort: try .cmd anyway
}

function determineShell() {
	if (!isWindows) {
		return;
	}
	usePowerShell();
}

function printUsage() {
	echo(chalk.red('Usage: node scripts/os-normalize.mjs --dir <dir> <run>'));
	echo(
		chalk.red('Usage (with args): node scripts/os-normalize.mjs --dir <dir> -- <run> [args...]'),
	);
}

const { dir = '.' } = argv;
const [run, ...args] = argv._;

if (!dir || !run) {
	printUsage();
	process.exit(2);
}

determineShell();
$.verbose = true;

cd(dir);
const cmd = normalizeCommand(run);

echo(chalk.cyan(`$ Running (dir: ${dir}) ${cmd} ${args.join(' ')}`));
try {
	await $({ stdio: 'inherit' })`${cmd} ${args}`;
} catch (err) {
	// Forward signal-based exits silently (e.g. Playwright's globalTeardown
	// SIGKILLs the n8n process, or the user Ctrl-C's `pnpm start`). Without
	// this, zx logs an unhandled `_ProcessOutput` traceback as the parent
	// is already shutting us down — pure noise.
	if (err?.signal || err?.exitCode === 137 || err?.exitCode === 143) {
		process.exit(err.exitCode ?? 0);
	}
	throw err;
}
