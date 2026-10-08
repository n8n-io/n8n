/**
 * Plan the Stryker runs: one job per package, with the targets to mutate and
 * the test files to run. The planners read the file system and git. Git is
 * injected so the unit tests can check which git commands a plan uses: only
 * `merge-base` and `diff`, never one that writes.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
	CLI_PACKAGE_DIR,
	MutateError,
	changedTestFilesForPackage,
	isMutableSource,
	parseHunkRanges,
	repoRoot,
	splitRange,
	toPosix,
} from './targets.mjs';

// Stryker's dry run stops with SIGABRT on the isolated-vm engine. See DEVP-257.
const BLOCKED_PACKAGES = new Set(['@n8n/expression-runtime']);

const TEST_COMMAND_HINT =
	'Name the command that runs its tests with --test-command, for example ' +
	"--test-command 'pnpm exec vitest run'.";

export function runGit(args) {
	const res = spawnSync('git', args, {
		cwd: repoRoot,
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
	});
	if (res.error) throw new MutateError(2, `git ${args[0]} failed to start: ${res.error.message}`);
	return res;
}

function readPackageJson(pkgRoot) {
	try {
		return JSON.parse(readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'));
	} catch {
		return {};
	}
}

/**
 * Why a package cannot be scored, or null when it can. Both planners call
 * this, so a named target and a --diff target get the same answer.
 *
 * By default Stryker runs the package's own vitest, so the `test` script must
 * run vitest. A custom test command replaces that script, so only the blocked
 * list applies then.
 */
export function ineligibleReason(pkgRoot, { customTestCommand = false } = {}) {
	const pkg = readPackageJson(pkgRoot);
	const pkgName = pkg.name || path.relative(repoRoot, pkgRoot);
	if (BLOCKED_PACKAGES.has(pkg.name)) {
		return {
			code: 'blocked',
			message: `${pkgName} is blocked: the isolated-vm engine crashes Stryker's dry run (DEVP-257)`,
		};
	}
	if (customTestCommand || /\bvitest\b/.test(pkg.scripts?.test ?? '')) return null;
	return { code: 'not-vitest', message: `${pkgName} is not a vitest package` };
}

// Walk up from a path to the nearest enclosing package.json (bounded by repoRoot).
export function findPackageRoot(fromAbs) {
	let dir = path.dirname(fromAbs);
	while (dir === repoRoot || dir.startsWith(`${repoRoot}${path.sep}`)) {
		if (existsSync(path.join(dir, 'package.json'))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return null;
}

function changedFilesSince(base, git) {
	// Diff the merge base against the working tree, not against HEAD. This also
	// scores uncommitted edits. On a PR checkout the tree is clean, thus the
	// result is the same as the branch diff.
	const mergeBase = git(['merge-base', base, 'HEAD']);
	if (mergeBase.status !== 0) {
		throw new MutateError(
			2,
			`No merge base with '${base}' — is the ref fetched?\n${mergeBase.stderr.trim()}`,
		);
	}
	const from = mergeBase.stdout.trim();
	const names = git(['diff', '--name-only', from]);
	if (names.status !== 0) {
		throw new MutateError(2, `git diff against '${base}' failed.\n${names.stderr.trim()}`);
	}
	const files = names.stdout
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean);
	return { from, files };
}

// Add one changed file to its package's job, or record why it was skipped.
function planChangedFile(file, { from, git, byPackage, skipped }) {
	if (!isMutableSource(file)) return;
	const abs = path.resolve(repoRoot, file);
	if (!existsSync(abs)) return; // the branch deleted the file

	const pkgRoot = findPackageRoot(abs);
	if (!pkgRoot) {
		skipped.push([file, 'no enclosing package']);
		return;
	}
	const reason = ineligibleReason(pkgRoot);
	if (reason) {
		skipped.push([file, reason.message]);
		return;
	}

	const ranges = parseHunkRanges(git(['diff', '-U0', from, '--', file]).stdout);
	if (ranges.length === 0) return;

	const rel = path.relative(pkgRoot, abs);
	const packageDir = path.relative(repoRoot, pkgRoot);
	const job = byPackage.get(pkgRoot) ?? { pkgRoot, packageDir, targets: [] };
	for (const r of ranges) job.targets.push(`${rel}:${r.start}-${r.end}`);
	byPackage.set(pkgRoot, job);
}

/**
 * One job per package for every line this branch changed. `packages/cli` jobs
 * also get the cli test files the patch changed, as their explicit test list.
 */
export function planFromDiff(base, { git = runGit } = {}) {
	const { from, files } = changedFilesSince(base, git);
	const byPackage = new Map();
	const skipped = [];
	for (const file of files) planChangedFile(file, { from, git, byPackage, skipped });
	for (const job of byPackage.values()) {
		if (toPosix(job.packageDir) === CLI_PACKAGE_DIR) {
			job.testFiles = changedTestFilesForPackage(files, job.packageDir).filter((file) =>
				existsSync(path.resolve(repoRoot, file)),
			);
		}
	}
	return { jobs: [...byPackage.values()], skipped };
}

/** What --diff prints about its plan: each skipped file, then the run count. */
export function diffPlanLines({ jobs, skipped }, base) {
	const lines = skipped.map(([file, why]) => `  skipped ${file} — ${why}`);
	if (jobs.length === 0) return lines;
	const ranges = jobs.reduce((n, job) => n + job.targets.length, 0);
	const summary = `Mutating ${ranges} changed range(s) across ${jobs.length} package(s) vs ${base}.`;
	return [...lines, `\n${summary}`];
}

// The package and the package-relative path of a named target.
function locateTarget(file, packageDirArg) {
	if (packageDirArg) {
		const pkgRoot = path.resolve(repoRoot, packageDirArg);
		if (!existsSync(pkgRoot)) throw new MutateError(2, `Package dir not found: ${pkgRoot}`);
		return { pkgRoot, rel: path.isAbsolute(file) ? path.relative(pkgRoot, file) : file };
	}
	const abs = path.resolve(repoRoot, file);
	if (!existsSync(abs)) throw new MutateError(2, `Target not found: ${abs}`, { showUsage: true });
	const pkgRoot = findPackageRoot(abs);
	if (!pkgRoot) {
		throw new MutateError(2, `Could not infer the package for ${file} — pass --package-dir.`, {
			showUsage: true,
		});
	}
	return { pkgRoot, rel: path.relative(pkgRoot, abs) };
}

/** The single job for a named target, or a MutateError that says what to fix. */
export function planFromTarget(targetArg, packageDirArg, { customTestCommand = false } = {}) {
	const { file, range } = splitRange(targetArg);
	const { pkgRoot, rel } = locateTarget(file, packageDirArg);

	if (rel.startsWith('..') || path.isAbsolute(rel)) {
		throw new MutateError(2, `Target must live inside the package. Got: ${rel}`);
	}
	if (!existsSync(path.join(pkgRoot, rel))) {
		throw new MutateError(2, `Target not found: ${path.join(pkgRoot, rel)}`);
	}
	if (!isMutableSource(rel)) {
		throw new MutateError(
			2,
			`Not a mutable source file (test/declaration/config/build output): ${rel}`,
		);
	}
	// --diff skips an ineligible package. A named target must refuse for the same
	// reason, or it starts a run that is known to crash.
	const reason = ineligibleReason(pkgRoot, { customTestCommand });
	if (reason) {
		const hint = reason.code === 'not-vitest' ? `\n${TEST_COMMAND_HINT}` : '';
		throw new MutateError(2, `Cannot mutate ${rel}: ${reason.message}${hint}`);
	}

	return {
		pkgRoot,
		packageDir: path.relative(repoRoot, pkgRoot),
		targets: [range ? `${rel}:${range}` : rel],
	};
}
