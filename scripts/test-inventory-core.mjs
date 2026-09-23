import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';

const hasVitestScript = (packageJson, name) =>
	packageJson.scripts?.[name]?.includes('vitest') ?? false;

export function configFromScript(script) {
	return script.match(/--config(?:=|\s+)([^\s]+)/)?.[1];
}

export function unitTarget(packageJson, packageDir) {
	const isFrontend =
		packageDir.startsWith('packages/frontend/') ||
		/^packages\/modules\/[^/]+\/frontend$/.test(packageDir);
	if (isFrontend && hasVitestScript(packageJson, 'test')) {
		const changed = Boolean(packageJson.scripts?.['test:changed']);
		return {
			lane: changed ? 'frontend-unit' : 'frontend-nightly',
			scope: changed ? 'changed' : 'nightly only',
			script: 'test',
		};
	}
	if (packageJson.name === 'n8n' && hasVitestScript(packageJson, 'test:unit')) {
		return { lane: 'cli-unit', scope: 'changed', script: 'test:unit' };
	}
	if (packageJson.name === 'n8n-nodes-base' && hasVitestScript(packageJson, 'test')) {
		return { lane: 'nodes-unit', scope: 'changed', script: 'test' };
	}
	if (hasVitestScript(packageJson, 'test:unit')) {
		return { lane: 'backend-unit', scope: 'full', script: 'test:unit' };
	}
	if (hasVitestScript(packageJson, 'test')) {
		return { lane: 'not-in-unit-ci', scope: 'not run', script: 'test' };
	}
	return undefined;
}

export function integrationTarget(packageJson) {
	if (!hasVitestScript(packageJson, 'test:integration')) return undefined;
	return {
		lane: packageJson.name === 'n8n' ? 'cli-integration' : 'backend-integration',
		scope: packageJson.name === 'n8n' ? 'changed' : 'full',
		script: 'test:integration',
	};
}

function filePath(file, target, repoRoot) {
	const path = file.replace(/^\[[^\]]+\]\s+/, '');
	return relative(repoRoot, isAbsolute(path) ? path : join(repoRoot, target.dir, path));
}

export function listedFiles(output, target, repoRoot) {
	return [
		...new Set(
			output
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter((line) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(line))
				.map((line) => filePath(line, target, repoRoot)),
		),
	]
		.sort()
		.map((path) => ({ path, tests: null }));
}

function leafCount(tasks) {
	let count = 0;
	for (const task of tasks) {
		if (Array.isArray(task.tasks)) count += leafCount(task.tasks);
		else if (task.type !== 'suite') count++;
	}
	return count;
}

export function countDynamicTests(serialized, target, repoRoot) {
	let tests;
	try {
		tests = JSON.parse(serialized);
	} catch {
		const start = serialized.lastIndexOf('\n[');
		const end = serialized.lastIndexOf(']');
		if (start === -1 || end === -1) throw new Error('Vitest did not produce JSON');
		tests = JSON.parse(serialized.slice(start + 1, end + 1));
	}
	if (!Array.isArray(tests)) throw new Error('Vitest did not produce a test list');
	const counts = new Map();
	for (const test of tests) {
		if (typeof test.file !== 'string') throw new Error('Vitest test has no file');
		const path = filePath(test.file, target, repoRoot);
		const count = Array.isArray(test.tasks) ? leafCount(test.tasks) : 1;
		counts.set(path, (counts.get(path) ?? 0) + count);
	}
	const fileCounts = [...counts]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([path, count]) => ({ path, tests: count }));
	return {
		files: fileCounts.length,
		fileCounts,
		tests: [...counts.values()].reduce((a, b) => a + b, 0),
	};
}

export function collectTarget(
	target,
	index,
	{
		outputDir,
		dynamic,
		timeoutSeconds,
		repoRoot,
		spawnProcess = spawn,
		killProcess = process.kill,
	},
) {
	return new Promise((resolve) => {
		const outputFile = join(outputDir, `${index}.json`);
		const env = {
			...process.env,
			CI: 'false',
			COVERAGE_ENABLED: 'false',
			DB_SQLITE_POOL_SIZE: '4',
			DB_TYPE: 'sqlite',
			N8N_LOG_LEVEL: 'silent',
			TZ: 'UTC',
		};
		let activePid;
		let settled = false;
		const finish = (result) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve({ ...target, ...result });
		};
		const timer = setTimeout(() => {
			try {
				if (activePid) killProcess(-activePid, 'SIGKILL');
			} catch {}
			finish({ error: `timed out after ${timeoutSeconds}s` });
		}, timeoutSeconds * 1000);
		const runList = (filesOnly) => {
			const args = [
				'exec',
				'vitest',
				'list',
				...(filesOnly ? ['--filesOnly'] : [`--json=${outputFile}`]),
				'--passWithNoTests',
				'--no-color',
				...(target.config ? ['--config', target.config] : []),
			];
			const child = spawnProcess('pnpm', args, {
				cwd: join(repoRoot, target.dir),
				detached: true,
				env,
				stdio: ['ignore', 'pipe', 'pipe'],
			});
			activePid = child.pid;
			let stdout = '';
			let stderr = '';
			child.stdout.on('data', (data) => (stdout += data));
			child.stderr.on('data', (data) => (stderr += data));
			child.on('error', (error) => finish({ error: error.message }));
			child.on('close', (code) => {
				if (settled) return;
				if (code !== 0) {
					finish({ error: `exited with ${code}: ${stderr.trim().slice(-500)}` });
					return;
				}
				if (filesOnly) {
					const fileCounts = listedFiles(stdout, target, repoRoot);
					finish({
						files: fileCounts.length,
						fileCounts,
						tests: null,
						...(dynamic && {
							warning:
								'Vitest dynamic parsing could not count this package. File count is available.',
						}),
					});
					return;
				}
				try {
					const serialized = existsSync(outputFile) ? readFileSync(outputFile, 'utf8') : stdout;
					finish(countDynamicTests(serialized, target, repoRoot));
				} catch {
					runList(true);
				}
			});
		};
		runList(!dynamic);
	});
}

export function aggregateInventory(results, dynamic) {
	const ordered = [...results].sort(
		(a, b) =>
			a.lane.localeCompare(b.lane) ||
			(b.tests ?? -1) - (a.tests ?? -1) ||
			a.package.localeCompare(b.package),
	);
	const laneMap = new Map();
	for (const result of ordered) {
		const lane = laneMap.get(result.lane) ?? {
			lane: result.lane,
			packages: 0,
			files: 0,
			tests: dynamic ? 0 : null,
			errors: 0,
			missingCaseCounts: 0,
		};
		lane.packages++;
		lane.files += result.files ?? 0;
		if (dynamic) lane.tests += result.tests ?? 0;
		lane.errors += result.error ? 1 : 0;
		lane.missingCaseCounts += dynamic && result.tests == null ? 1 : 0;
		laneMap.set(result.lane, lane);
	}
	const lanes = [...laneMap.values()].sort((a, b) => a.lane.localeCompare(b.lane));
	const prResults = ordered.filter(({ scope }) => scope !== 'nightly only' && scope !== 'not run');
	const prLanes = lanes.filter(
		({ lane }) => lane !== 'frontend-nightly' && lane !== 'not-in-unit-ci',
	);
	return {
		schemaVersion: 1,
		mode: dynamic ? 'dynamic' : 'files',
		note: dynamic
			? 'Dynamic mode counts configured test cases. Change-scoped PR CI jobs may run fewer tests.'
			: 'File mode counts configured test files. Change-scoped PR CI jobs may run fewer files. Use --dynamic for case counts.',
		ci: {
			packages: new Set(prResults.map((result) => result.package)).size,
			targets: prResults.length,
			files: prLanes.reduce((total, lane) => total + lane.files, 0),
			tests: dynamic ? prLanes.reduce((total, lane) => total + lane.tests, 0) : null,
			missingCaseCounts: dynamic
				? prLanes.reduce((total, lane) => total + lane.missingCaseCounts, 0)
				: 0,
			errors: prLanes.reduce((total, lane) => total + lane.errors, 0),
		},
		lanes,
		packages: ordered,
	};
}
