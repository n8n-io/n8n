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
await $({ stdio: 'inherit' })`${cmd} ${args}`;
