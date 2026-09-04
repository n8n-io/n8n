#!/usr/bin/env node
/**
 * This script is used to build the n8n application for production.
 * It will:
 * 1. Clean the previous build output
 * 2. Run pnpm install and build
 * 3. Prepare for deployment - clean package.json files
 * 4. Create a pruned production deployment in 'compiled'
 */

import { $, echo, fs, chalk } from 'zx';
import path from 'path';
import os from 'os';

// Check if running in a CI environment
const isCI = process.env.CI === 'true';

// Check if test controller should be excluded (CI + flag not set)
const excludeTestController =
	process.env.CI === 'true' && process.env.INCLUDE_TEST_CONTROLLER !== 'true';

// Disable verbose output and force color only if not in CI
$.verbose = !isCI;
process.env.FORCE_COLOR = isCI ? '0' : '1';

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const isInScriptsDir = path.basename(scriptDir) === 'scripts';
const rootDir = isInScriptsDir ? path.join(scriptDir, '..') : scriptDir;

// #region ===== Configuration =====
const config = {
	compiledAppDir: path.join(rootDir, 'compiled'),
	compiledTaskRunnerDir: path.join(rootDir, 'dist', 'task-runner-javascript'),
	cliDir: path.join(rootDir, 'packages', 'cli'),
	rootDir: rootDir,
};

// #endregion ===== Configuration =====

// #region ===== Helper Functions =====
const timers = new Map();

function startTimer(name) {
	timers.set(name, Date.now());
}

function getElapsedTime(name) {
	const start = timers.get(name);
	if (!start) return 0;
	return Math.floor((Date.now() - start) / 1000);
}

function formatDuration(seconds) {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
	if (minutes > 0) return `${minutes}m ${secs}s`;
	return `${secs}s`;
}

function printHeader(title) {
	echo('');
	echo(chalk.blue.bold(`===== ${title} =====`));
}

function printDivider() {
	echo(chalk.gray('-----------------------------------------------'));
}

// #endregion ===== Helper Functions =====

// #region ===== Main Build Process =====
printHeader('n8n Build & Production Preparation');
echo(`INFO: Output Directory: ${config.compiledAppDir}`);
printDivider();

startTimer('total_build');

// 0. Clean Previous Build Output
echo(chalk.yellow(`INFO: Cleaning previous output directory: ${config.compiledAppDir}...`));
await fs.remove(config.compiledAppDir);
echo(
	chalk.yellow(
		`INFO: Cleaning previous task runner output directory: ${config.compiledTaskRunnerDir}...`,
	),
);
await fs.remove(config.compiledTaskRunnerDir);
printDivider();

// 1. Local Application Pre-build
echo(chalk.yellow('INFO: Starting local application pre-build...'));
startTimer('package_build');

echo(chalk.yellow('INFO: Running pnpm install and build...'));
try {
	const installProcess = $`cd ${config.rootDir} && pnpm install --frozen-lockfile`;
	installProcess.pipe(process.stdout);
	await installProcess;

	const buildProcess = $`cd ${config.rootDir} && pnpm build --summarize`;
	buildProcess.pipe(process.stdout);
	await buildProcess;

	echo(chalk.green('✅ pnpm install and build completed'));
} catch (error) {
	console.error(chalk.red('\n🛑 BUILD PROCESS FAILED!'));
	console.error(chalk.red('An error occurred during the build process:'));
	process.exit(1);
}

const packageBuildTime = getElapsedTime('package_build');
echo(chalk.green(`✅ Package build completed in ${formatDuration(packageBuildTime)}`));
printDivider();

// 2. Prepare for deployment - clean package.json files
echo(chalk.yellow('INFO: Performing pre-deploy cleanup on package.json files...'));

// Find and backup package.json files
const packageJsonFiles = await $`cd ${config.rootDir} && find . -name "package.json" \
-not -path "./node_modules/*" \
-not -path "*/node_modules/*" \
-not -path "./compiled/*" \
-type f`.lines();

// Backup all package.json files. The FE trim below mutates them, and pnpm verifies
// the lockfile before running any later script, which fails until they are restored.
// Backups live outside the workspace: siblings would be packed into the deployment.
const packageJsonBackupDir = await fs.mkdtemp(path.join(os.tmpdir(), 'n8n-build-pkgjson-'));
for (const file of packageJsonFiles) {
	if (file) {
		await fs.copy(path.join(config.rootDir, file), path.join(packageJsonBackupDir, file));
	}
}

// Restore package.json files from backup. Called from the `finally` below, so it
// always runs — on the success path and on any failure the trim → deploy → strip
// → SBOM sequence below can throw. A missing backup is NOT silently skipped:
// leaving a trimmed package.json on disk unnoticed is exactly the failure that
// broke a later `pnpm` command's lockfile check in production — it saw whatever
// the trim left behind and reported the gap as an "outdated lockfile", with no
// error anywhere here.
async function restorePackageJsonFiles() {
	const missing = [];
	for (const file of packageJsonFiles) {
		if (!file) continue;
		const backupPath = path.join(packageJsonBackupDir, file);
		if (await fs.pathExists(backupPath)) {
			await fs.move(backupPath, path.join(config.rootDir, file), { overwrite: true });
		} else {
			missing.push(file);
		}
	}
	await fs.remove(packageJsonBackupDir);
	if (missing.length > 0) {
		throw new Error(
			`Failed to restore ${missing.length} package.json file(s) from backup — the working ` +
				`tree is left mutated: ${missing.join(', ')}`,
		);
	}
}

let packageDeployTime = 0;

// Everything from the FE trim through the SBOM step mutates package.json files or
// the production closure, and any step in between can throw (a failed deploy, a
// strip that finds nothing left to strip, a broken closure). Wrap it all in one
// try/finally so restoration always runs, instead of relying on every failure path
// remembering to call it before exiting.
try {
	// Run FE trim script
	await $`cd ${config.rootDir} && node .github/scripts/trim-fe-packageJson.js`;

	echo(
		chalk.yellow(`INFO: Creating pruned production deployment in '${config.compiledAppDir}'...`),
	);
	startTimer('package_deploy');

	await fs.ensureDir(config.compiledAppDir);

	if (excludeTestController) {
		const cliPackagePath = path.join(config.rootDir, 'packages/cli/package.json');
		const content = await fs.readFile(cliPackagePath, 'utf8');
		const packageJson = JSON.parse(content);
		packageJson.files.push('!dist/**/e2e.*');
		await fs.writeFile(cliPackagePath, JSON.stringify(packageJson, null, 2));
		echo(chalk.gray('  - Excluded test controller from packages/cli/package.json'));
	}

	// The release SBOM is built by cdxgen inventorying the top-level node_modules of this
	// deployed closure. Since #32569 dropped shamefully-hoist, only direct deps surface at
	// top level, so cdxgen would miss the transitive tree (the manifest would be incomplete).
	// Re-enable hoisting for the licenses build only — shipped images keep the non-hoisted
	// layout, since regular builds leave N8N_GENERATE_LICENSES unset.
	// `PNPM_CONFIG_*` and not `npm_config_*`: pnpm 11 no longer reads npm-style env config,
	// so an `npm_config_` name here is silently ignored and the SBOM comes out incomplete.
	const generateLicenses = process.env.N8N_GENERATE_LICENSES === 'true';
	if (generateLicenses) {
		process.env.PNPM_CONFIG_SHAMEFULLY_HOIST = 'true';
	}

	await $`cd ${config.rootDir} && NODE_ENV=production DOCKER_BUILD=true pnpm --filter=n8n --prod --legacy deploy --no-optional ./compiled`;

	// Strip test/example/benchmark dirs shipped inside production deps that lack a
	// `files` field in their package.json. These are valid runtime deps but their
	// authors published full source trees; syft inventories the subdirs as phantom
	// packages with no license, which fails enterprise SBOM license gates.
	// `.nothrow()` for the same reason as the runtime-asset check below: zx runs
	// with `pipefail`, and `du`/`find` exit non-zero for a single unstattable path.
	// These only feed a diagnostic, so a warning must never fail the build.
	const measureKb = async (dir) =>
		Number((await $`du -sk ${dir} | cut -f1`.nothrow()).stdout.trim()) || 0;

	const closureKbBefore = await measureKb(config.compiledAppDir);

	echo(chalk.yellow('INFO: Stripping test/example/benchmark dirs from production closure...'));
	const phantomDirs = [
		'resolve/*/test',
		'import-in-the-middle/*/test',
		'github-from-package/*/example',
		'tedious/*/benchmarks',
	];
	for (const pattern of phantomDirs) {
		await $`find ${config.compiledAppDir}/node_modules/.pnpm -type d -path "*/${pattern}" -exec rm -rf {} + 2>/dev/null || true`;
	}
	echo(chalk.green('✅ Phantom dirs stripped'));

	// @confluentinc/kafka-javascript vendors librdkafka's full C source tree for its
	// build-from-source fallback (~11MB), but the prebuilt binary - librdkafka statically
	// linked in, no .so/.a shipped - is what actually loads at runtime on Alpine. The
	// source is dead weight in the shipped image.
	// isolated-vm ships prebuilds for darwin, win32 and linux. The image compiles
	// the binding from source, so these are unused. Removing them also keeps 15MB
	// out of the build context.
	// Third-party source maps are 20k files that only help when debugging inside a
	// dependency. First-party maps stay: source-map-support uses them for our own
	// stack traces. `file+packages` is how pnpm names the workspace packages.
	echo(chalk.yellow('INFO: Stripping third-party source maps...'));
	await $`find ${config.compiledAppDir}/node_modules/.pnpm -name "*.map" -not -path "*file+packages*" -delete 2>/dev/null || true`;
	echo(chalk.green('✅ Third-party source maps stripped'));

	// agent-browser ships one binary per platform. The image is Alpine, so only the
	// musl builds can run. Both architectures stay, because the build host does not
	// always match the image platform. The name filter matters: bin/ also holds
	// agent-browser.js, the launcher that package.json's `bin` field points at.
	echo(chalk.yellow('INFO: Stripping unusable agent-browser binaries...'));
	await $`find ${config.compiledAppDir}/node_modules/.pnpm -path "*agent-browser/bin/*" -type f -name "agent-browser-*" -not -name "*linux-musl*" -delete 2>/dev/null || true`;

	// Same class of bug as the isolated-vm rebuild in docker/images/n8n/Dockerfile:
	// the hardened base breaks a package's own musl detection. There it is
	// node-gyp-build reading /etc/alpine-release; here the agent-browser launcher
	// shells out to `ldd`, and swallows the failure (`|| true`) so its
	// /lib/ld-musl-* fallback never runs. The base ships no `ldd`, so detection
	// returns false and the launcher asks for the glibc build.
	//
	// libc6-compat does not save it: that provides the loader but not the full
	// symbol set, so the glibc binary gets past the loader and dies relocating
	// (`__res_init: symbol not found`, verified on a published image, native arm64).
	// isolated-vm is rebuilt from source instead; agent-browser ships prebuilt Rust
	// binaries, so hard-link the glibc name onto the musl build and let the wrong
	// answer resolve to something that runs. Links, so no additional bytes.
	echo(chalk.yellow('INFO: Aliasing glibc agent-browser names to the musl builds...'));
	await $`
	  set -eu
	  find ${config.compiledAppDir}/node_modules/.pnpm -path "*agent-browser/bin" -type d | while read -r bin; do
	    for a in x64 arm64; do
	      musl="$bin/agent-browser-linux-musl-$a"
	      [ -f "$musl" ] || continue
	      ln -f "$musl" "$bin/agent-browser-linux-$a"
	    done
	  done
	`;
	echo(chalk.green('✅ Non-musl agent-browser binaries stripped'));

	echo(chalk.yellow('INFO: Stripping isolated-vm prebuilds...'));
	await $`find ${config.compiledAppDir}/node_modules/.pnpm -type d -path "*/isolated-vm/prebuilds" -exec rm -rf {} + 2>/dev/null || true`;
	echo(chalk.green('✅ isolated-vm prebuilds stripped'));

	echo(chalk.yellow('INFO: Stripping unused librdkafka source tree...'));
	await $`find ${config.compiledAppDir}/node_modules/.pnpm -type d -path "*/@confluentinc/kafka-javascript/deps" -exec rm -rf {} + 2>/dev/null || true`;
	echo(chalk.green('✅ librdkafka source tree stripped'));

	// Strip TypeScript declaration artifacts to cut the image's file count, which
	// dominates layer extraction time on constrained hosts. Only these two explicit
	// patterns are safe to remove by extension: several features read other
	// "source-looking" files off disk at request time (dist/node-definitions/**/*.ts
	// for AI node lookups, instance-ai skills/knowledge-base *.md), so broader globs
	// like '*.ts' or '*.md' must not come back here. .js.map is also kept —
	// source-map-support needs it for production stack traces.
	echo(chalk.yellow('INFO: Stripping TypeScript declaration files from production closure...'));
	await $`find ${config.compiledAppDir} -type f \\( -name '*.d.ts' -o -name '*.d.ts.map' \\) -delete 2>/dev/null || true`;
	echo(chalk.green('✅ Declaration files stripped'));

	// A build that loses these runtime-data trees (a strip regression, a package.json
	// `files` change, a pnpm deploy change) still boots, so the damage only surfaces
	// on the first AI request. Fail the build here instead.
	// `.nothrow()` because zx runs with `pipefail`: one unreadable path would
	// otherwise turn a healthy build into an unhandled rejection.
	// Both strips swallow errors, and the size line below is a report rather than a
	// gate — so a pattern that stops matching (a pnpm layout change, a quoting
	// regression) would make them silent no-ops and nothing would go red. Assert
	// the deletions happened, not just that the survivors survived.
	const strippedPatterns = [
		{
			label: 'third-party source maps',
			find: ['-name', '*.map', '-not', '-path', '*file+packages*'],
		},
		{
			// The linux names survive as hard links onto the musl builds (see above),
			// so only the other platforms should be gone.
			label: 'non-linux agent-browser binaries',
			find: [
				'-path',
				'*agent-browser/bin/*',
				'-type',
				'f',
				'(',
				'-name',
				'agent-browser-darwin-*',
				'-o',
				'-name',
				'agent-browser-win32-*',
				')',
			],
		},
	];

	echo(chalk.yellow('INFO: Verifying strips removed what they targeted'));
	for (const { label, find } of strippedPatterns) {
		const left = await $`find ${config.compiledAppDir}/node_modules/.pnpm ${find}`.nothrow();
		// A `find` that could not traverse the tree also returns empty stdout, which
		// would read as "nothing survived" — the exact false pass this check exists
		// to prevent. Fail closed when it could not run.
		if (left.exitCode !== 0) {
			echo(
				chalk.red(`ERROR: could not verify ${label} were stripped (find exited ${left.exitCode})`),
			);
			echo(chalk.dim(left.stderr.slice(0, 400)));
			throw new Error(`Could not verify ${label} were stripped (find exited ${left.exitCode})`);
		}
		const count = left.stdout.split('\n').filter(Boolean).length;
		if (count > 0) {
			echo(
				chalk.red(`ERROR: ${count} ${label} survived the strip — the pattern no longer matches`),
			);
			throw new Error(`${count} ${label} survived the strip — the pattern no longer matches`);
		}
	}
	// The alias is what makes agent-browser resolvable in the image at all, so
	// prove the glibc name and the musl build are the same inode rather than
	// trusting the link step ran.
	const aliasCheck = await $`
	  find ${config.compiledAppDir}/node_modules/.pnpm -path "*agent-browser/bin" -type d | while read -r bin; do
	    for a in x64 arm64; do
	      musl="$bin/agent-browser-linux-musl-$a"
	      alias="$bin/agent-browser-linux-$a"
	      [ -f "$musl" ] || continue
	      if [ ! -f "$alias" ] || [ "$(stat -c %i "$musl" 2>/dev/null || stat -f %i "$musl")" != "$(stat -c %i "$alias" 2>/dev/null || stat -f %i "$alias")" ]; then
	        echo "MISMATCH $alias"
	      fi
	    done
	  done
	`.nothrow();
	// Same reasoning as above: a failed traversal produces no MISMATCH lines, so
	// treat a non-zero exit as unverifiable rather than as a pass.
	if (aliasCheck.exitCode !== 0 || aliasCheck.stdout.includes('MISMATCH')) {
		echo(chalk.red('ERROR: agent-browser glibc alias does not point at the musl build'));
		echo(chalk.dim(aliasCheck.stdout || aliasCheck.stderr.slice(0, 400)));
		throw new Error('agent-browser glibc alias does not point at the musl build');
	}

	echo(chalk.green('✅ Strips verified'));

	const runtimeAssetGlobs = [
		'*/@n8n/instance-ai/skills/*',
		'*/@n8n/instance-ai/knowledge-base/*',
		'*/dist/node-definitions/*',
		// source-map-support reads these for our own stack traces.
		'*file+packages*/dist/*.js.map',
		// The only agent-browser binary the Alpine image can run.
		'*agent-browser/bin/*linux-musl*',
		// The launcher that package.json's `bin` resolves to.
		'*agent-browser/bin/agent-browser.js',
	];

	echo(chalk.yellow('INFO: Verifying Runtime assets'));
	for (const glob of runtimeAssetGlobs) {
		const found = await $`find ${config.compiledAppDir} -type f -path ${glob}`.nothrow();
		if (found.stdout.split('\n').filter(Boolean).length === 0) {
			echo(chalk.red(`ERROR: no files left under ${glob} — runtime assets were stripped`));
			throw new Error(`No files left under ${glob} — runtime assets were stripped`);
		}
	}
	echo(chalk.green('✅ Runtime assets intact'));

	// Reported, not enforced. A hard budget fails CI on ordinary dependency growth,
	// which costs more than the regression it catches.
	const closureBytes = (await measureKb(config.compiledAppDir)) * 1024;
	const closureFiles = Number(
		(await $`find ${config.compiledAppDir} -type f | wc -l`.nothrow()).stdout.trim(),
	);
	if (closureKbBefore > 0 && closureBytes > 0) {
		echo(
			chalk.green(
				`✅ Closure ${((closureKbBefore * 1024) / 1e6).toFixed(0)}MB -> ${(closureBytes / 1e6).toFixed(0)}MB ` +
					`(stripped ${((closureKbBefore * 1024 - closureBytes) / 1e6).toFixed(0)}MB), ${closureFiles} files`,
			),
		);
	} else {
		echo(chalk.yellow('INFO: Closure size unavailable (du could not read the tree)'));
	}

	await fs.ensureDir(config.compiledTaskRunnerDir);

	echo(
		chalk.yellow(
			`INFO: Creating JavaScript task runner deployment in '${config.compiledTaskRunnerDir}'...`,
		),
	);

	// Deliberately unstripped. This closure ships as its own image and is two
	// orders of magnitude smaller than the n8n one, so the strips above are not
	// worth duplicating here — the closure figure they report covers the n8n image
	// only, not the shipped total.
	await $`cd ${config.rootDir} && NODE_ENV=production DOCKER_BUILD=true pnpm --filter=@n8n/task-runner --prod --legacy deploy --no-optional ${config.compiledTaskRunnerDir}`;

	// Check the production closure for single-instance dependency duplication. A curated
	// library resolving to more than one physical copy silently breaks instanceof /
	// singletons at runtime. Report-first: a duplicate is surfaced loudly but does NOT fail
	// the build — matching the continue-on-error npm-install CI jobs, so a transitive
	// third-party re-split can't hard-break every nightly/release with no config escape.
	// Promote to a hard gate once it has proven stable across releases.
	// Both closures this build produces are checked. The task runner is deployed independently and
	// ships as its own image, and `@n8n/task-runner` is a host package — it carries the curated libs as
	// real dependencies rather than peers, so it is if anything the likelier place for a second copy.
	const verifySingleInstance = async (label, dir) => {
		echo(chalk.yellow(`INFO: Verifying single-instance dependency integrity in ${label}...`));
		// `--dir` rather than `--filter`: a filter that matches nothing exits 0, so a renamed or moved
		// package would report a passing check having run no verifier at all.
		const verifyProcess =
			$`cd ${config.rootDir} && pnpm --dir packages/testing/code-health exec tsx src/cli.ts verify-closure ${dir}`.nothrow();
		verifyProcess.pipe(process.stdout);
		const { exitCode } = await verifyProcess;
		// 0 and 3 are the only codes the verifier itself produces; everything else (tsx failing to load,
		// a missing package or closure, a crash) means the closure was never checked.
		if (exitCode === 0) {
			echo(chalk.green(`✅ Single-instance dependency check passed for ${label}`));
		} else if (exitCode === 3) {
			echo(
				chalk.red(
					`⚠️  Single-instance dependency duplication reported in ${label} (see above) — not failing the build (report-first).`,
				),
			);
		} else {
			echo(
				chalk.red(
					`⚠️  Single-instance verifier failed to run for ${label} (exit ${exitCode}); that closure was NOT checked. This is a tooling error, not a duplication report.`,
				),
			);
		}
	};

	await verifySingleInstance('the production closure', config.compiledAppDir);
	await verifySingleInstance('the JavaScript task runner closure', config.compiledTaskRunnerDir);

	packageDeployTime = getElapsedTime('package_deploy');

	// Generate SBOM + render THIRD_PARTY_LICENSES.md from the deployed runtime closure.
	// Single source of truth: the SBOM. Both the runtime endpoint (packages/cli/) and the
	// release asset (compiled/) get the same SBOM-derived attribution file.
	// Tooling (cdxgen + renderer) is installed in .github/scripts/, alongside other CI
	// scripts, so we don't carry a second isolated install.
	//
	// Default: skip. cdxgen + license rendering adds ~minutes to every build:deploy and
	// is only needed for the release SBOM job. The release-publish workflow opts in by
	// setting N8N_GENERATE_LICENSES=true; regular CI Docker prepare runs skip it.
	if (generateLicenses) {
		echo(chalk.yellow('INFO: Generating SBOM and rendering THIRD_PARTY_LICENSES.md...'));
		try {
			const toolingDir = path.join(config.rootDir, '.github', 'scripts');
			await $`cd ${config.rootDir} && pnpm install --frozen-lockfile --dir .github/scripts --ignore-workspace`;
			const generateProcess = $`cd ${toolingDir} && pnpm generate-licenses`;
			generateProcess.pipe(process.stdout);
			await generateProcess;
			echo(chalk.green('✅ SBOM generated and THIRD_PARTY_LICENSES.md rendered'));
		} catch (error) {
			echo(chalk.red(`ERROR: SBOM/license generation failed: ${error.message}`));
			// In CI, fail loudly. A stale or missing THIRD_PARTY_LICENSES.md must never ship —
			// the release workflow uploads it unconditionally and would otherwise publish
			// an incomplete attribution file.
			if (process.env.CI === 'true') {
				throw error;
			}
			echo(chalk.yellow('⚠️  Warning: continuing local build (CI=true would have failed)'));
		}
	} else {
		echo(
			chalk.gray(
				'INFO: Skipping SBOM/license generation (set N8N_GENERATE_LICENSES=true to enable)',
			),
		);
	}
} finally {
	// Runs on both the success path and every throw above, so a trimmed
	// package.json can no longer survive a failure partway through this block.
	await restorePackageJsonFiles();
}

// Calculate output size
const compiledAppOutputSize = (await $`du -sh ${config.compiledAppDir} | cut -f1`).stdout.trim();
const compiledTaskRunnerOutputSize = (
	await $`du -sh ${config.compiledTaskRunnerDir} | cut -f1`
).stdout.trim();

// Generate build manifests
const buildManifest = {
	buildTime: new Date().toISOString(),
	artifactSize: compiledAppOutputSize,
	buildDuration: {
		packageBuild: packageBuildTime,
		packageDeploy: packageDeployTime,
		total: getElapsedTime('total_build'),
	},
};

// Copy third-party licenses if they exist
const licensesSourcePath = path.join(config.cliDir, 'THIRD_PARTY_LICENSES.md');
if (await fs.pathExists(licensesSourcePath)) {
	await fs.copy(licensesSourcePath, path.join(config.compiledAppDir, 'THIRD_PARTY_LICENSES.md'));
}

await fs.writeJson(path.join(config.compiledAppDir, 'build-manifest.json'), buildManifest, {
	spaces: 2,
});

const taskRunnerbuildManifest = {
	buildTime: new Date().toISOString(),
	artifactSize: compiledTaskRunnerOutputSize,
	buildDuration: {
		packageBuild: packageBuildTime,
		packageDeploy: packageDeployTime,
		total: getElapsedTime('total_build'),
	},
};

await fs.writeJson(
	path.join(config.compiledTaskRunnerDir, 'build-manifest.json'),
	taskRunnerbuildManifest,
	{
		spaces: 2,
	},
);

echo(chalk.green(`✅ Package deployment completed in ${formatDuration(packageDeployTime)}`));
echo(`INFO: Size of ${config.compiledAppDir}: ${compiledAppOutputSize}`);
printDivider();

// Calculate total time
const totalBuildTime = getElapsedTime('total_build');

// #endregion ===== Main Build Process =====

// #region ===== Final Output =====
echo('');
echo(chalk.green.bold('================ BUILD SUMMARY ================'));
echo(chalk.green(`✅ n8n built successfully!`));
echo('');
echo(chalk.blue('📦 Build Output:'));
echo(chalk.green('   n8n:'));
echo(`   Directory:      ${path.resolve(config.compiledAppDir)}`);
echo(`   Size:           ${compiledAppOutputSize}`);
echo('');
echo(chalk.green('   task-runner-javascript:'));
echo(`   Directory:      ${path.resolve(config.compiledTaskRunnerDir)}`);
echo(`   Size:           ${compiledTaskRunnerOutputSize}`);
echo('');
echo(chalk.blue('⏱️  Build Times:'));
echo(`   Package Build:  ${formatDuration(packageBuildTime)}`);
echo(`   Package Deploy: ${formatDuration(packageDeployTime)}`);
echo(chalk.gray('   -----------------------------'));
echo(chalk.bold(`   Total Time:     ${formatDuration(totalBuildTime)}`));
echo('');
echo(chalk.blue('📋 Build Manifests:'));
echo(`   ${path.resolve(config.compiledAppDir)}/build-manifest.json`);
echo(`   ${path.resolve(config.compiledTaskRunnerDir)}/build-manifest.json`);
echo(chalk.green.bold('=============================================='));

// #endregion ===== Final Output =====

// Exit with success
process.exit(0);
