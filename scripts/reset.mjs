// Resets the repository by deleting all untracked files except for few exceptions.
import { $, argv, echo, fs } from 'zx';

$.verbose = true;
process.env.FORCE_COLOR = '1';

// `--light` (`-l`): only refresh build outputs/caches. Keeps node_modules and
// all untracked files, skips the confirmation prompt. Use this when build
// outputs or the turbo cache are stale (e.g. after switching branches or
// worktrees) but dependencies haven't changed. `--no-install` skips the
// dependency reconcile step.
const light = argv.light || argv.l;

if (light) {
	const runInstall = argv.install !== false;

	echo(
		'⚡ Lightweight reset: keeping node_modules and untracked files, refreshing build outputs only.',
	);

	echo('🧹 Cleaning build outputs (dist, .turbo)...');
	await $`pnpm clean`;

	if (runInstall) {
		echo('⏬ Reconciling dependencies (pnpm install)...');
		await $`pnpm install`;
	}

	// TURBO_FORCE ignores the local artifact cache (node_modules/.cache/turbo),
	// which `pnpm clean` does not remove, so a stale cache can't be served.
	echo('🏗️ Force-rebuilding (TURBO_FORCE)...');
	await $({ env: { ...process.env, TURBO_FORCE: 'true' } })`pnpm build --concurrency=50%`;

	process.exit(0);
}

const excludePatterns = ['/.vscode/', '/.idea/', '.env', '/.claude/'];
const excludeFlags = excludePatterns.map((exclude) => ['-e', exclude]).flat();

echo(
	`This will delete all untracked files except for those matching the following patterns: ${excludePatterns.map((x) => `"${x}"`).join(', ')}.`,
);

const skipConfirmation = argv.force || argv.f;

if (!skipConfirmation) {
	const answer = await question('❓ Do you want to continue? (y/n) ');

	if (!['y', 'Y', ''].includes(answer)) {
		echo('Aborting...');
		process.exit(0);
	}
}

echo('🧹 Cleaning untracked files...');
await $({ verbose: false })`git clean -fxd ${excludeFlags}`;
// In case node_modules is not removed by git clean
fs.removeSync('node_modules');

echo('⏬ Running pnpm install...');
await $`pnpm install`;

echo('🏗️ Running pnpm build...');
await $`pnpm build --concurrency=50%`;
