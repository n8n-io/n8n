// Resets the repository's build state. Lightweight by default (refresh build
// outputs/caches only); pass `--full` to also delete all untracked files
// (except a few exceptions) and reinstall dependencies.
import { $, argv, echo, fs } from 'zx';

let failedOnce = false;
$.verbose = true;
process.env.FORCE_COLOR = '1';

// By default this runs the lightweight reset: only refresh build
// outputs/caches. Keeps node_modules and all untracked files, skips the
// confirmation prompt. Use this when build outputs or the turbo cache are
// stale (e.g. after switching branches or worktrees) but dependencies haven't
// changed. `--no-install` skips the dependency reconcile step.
//
// `--full`: the heavy reset. Deletes all untracked files (except a few
// exceptions), wipes node_modules, reinstalls dependencies, then rebuilds.
// Reach for this only when the lightweight reset didn't fix your issue.
const full = argv.full;

// `--mem <MB>` raises the V8 old-space cap for each build process via
// NODE_OPTIONS, which turbo passes through to the per-package builds. Bump it if
// a build runs out of memory (e.g. the JS `sass` compiler). Default 8192.
// Note: this only helps JS-heap OOMs — native `sass-embedded` compilation runs
// in a separate Dart process that this limit does not bound; if that OOMs,
// lower build concurrency or a better orchestration is needed.
const mem = argv.mem ? Number(argv.mem) : 8192;
if (!Number.isInteger(mem) || mem <= 0) {
	echo('❌ --mem must be a positive integer (MB)');
	process.exit(1);
}
const nodeOptions = process.env.NODE_OPTIONS
	? `${process.env.NODE_OPTIONS} --max-old-space-size=${mem}`
	: `--max-old-space-size=${mem}`;
const buildEnv = { ...process.env, NODE_OPTIONS: nodeOptions };

async function buildWithSingleRetry() {
	const res = await $({ env: buildEnv })`pnpm build`.nothrow();
	if (res.exitCode !== 0) {
		failedOnce = true;
		// Build failed on the initial full-repo build, most likely due to dart-sass being evicted.
		// Re-trigger build, already built items are fast-tracked by turbo cache, and building continues
		console.log("! Build failed, most likely due to memory pressure. Retrying build");
		await $({ env: buildEnv })`pnpm build`;
	}
}

if (!full) {
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

	echo(`🏗️ Rebuilding (--max-old-space-size=${mem})...`);
	await buildWithSingleRetry();

	if (failedOnce) {
		console.log("🟢 The build script failed once, but was able to recover successfully.")
	}

	echo('');
	echo('✅ Lightweight reset done!');
	echo(
		"💡 Still seeing issues? Run `pnpm reset --full` for a full reset (wipes untracked files & node_modules, then reinstalls and rebuilds).",
	);
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

echo(`🏗️ Running pnpm build (--max-old-space-size=${mem})...`);
await buildWithSingleRetry();

console.log("✅ pnpm reset done!")
if (failedOnce) {
	console.log("🟢 The build script failed once, but was able to recover successfully.")
}
