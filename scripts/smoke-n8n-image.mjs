#!/usr/bin/env node
/**
 * Smoke-tests the n8n docker image against the invocation patterns its
 * downstream consumers actually use, so that base-image / Dockerfile changes
 * that break those consumers fail at PR-time rather than in production.
 *
 * Two sources of invocations:
 *
 * 1. **Hardcoded contract** — what *this image* promises (default entrypoint,
 *    /usr/local/bin/n8n exists). Stable across consumers.
 *
 * 2. **Live from consumer charts** — pulls n8n-cloud's helm chart at runtime,
 *    renders it, and extracts the actual container spec (command + args +
 *    securityContext). Catches drift if cloud changes their invocation, AND
 *    fails this build if we break theirs.
 *
 * The cloud-side fetch requires `helm`, `gh`, and a token with read access
 * to n8n-io/n8n-cloud (CI provides via GH_TOKEN). It can be disabled with
 * SMOKE_SKIP_CLOUD=true (e.g. on PRs where the cloud read is unreachable).
 *
 * Failure modes this catches:
 * - n8n binary moved out of /usr/local/bin (e.g. DHI 3.22 → 3.23 layout drift)
 * - n8n module relocated such that `node /absolute/path/n8n` can no longer
 *   load it
 * - default entrypoint regression (tini / docker-entrypoint.sh breakage)
 * - cloud changing their invocation in a way we haven't accommodated
 */

import { $, echo, chalk, fs, tmpdir } from 'zx';
import path from 'node:path';
import { parseAllDocuments } from 'yaml';

$.verbose = false;
process.env.FORCE_COLOR = '1';

// #region ===== Configuration =====
const config = {
	image: process.env.SMOKE_IMAGE || 'n8nio/n8n:local',
	timeoutMs: Number(process.env.SMOKE_TIMEOUT_MS || 30_000),
	skipCloud: process.env.SMOKE_SKIP_CLOUD === 'true',
	cloud: {
		repo: process.env.CLOUD_CHART_REPO || 'n8n-io/n8n-cloud',
		ref: process.env.CLOUD_CHART_REF || 'main',
		// Paths within the cloned cloud repo. These can move when cloud reorganises;
		// override via env vars if so. Last verified 2026-05-18.
		chartPath:
			process.env.CLOUD_CHART_PATH || 'packages/instance-controller/charts/n8napp/n8n',
		valuesPath:
			process.env.CLOUD_CHART_VALUES ||
			'packages/instance-controller/charts/n8napp/values-v1.yaml',
	},
};
// #endregion

// #region ===== Hardcoded contract — what THIS image promises =====
const HARDCODED_INVOCATIONS = [
	{
		name: 'default image entrypoint (tini + docker-entrypoint.sh)',
		source: 'docker/images/n8n/Dockerfile',
		user: '1000:1000',
		entrypoint: null, // image default
		args: ['--help'],
		expectStdout: /Available commands/,
	},
	{
		name: 'n8n binary directly at /usr/local/bin/n8n (FHS contract)',
		source: 'docker/images/n8n/Dockerfile',
		user: '1000:1000',
		entrypoint: '/usr/local/bin/n8n',
		args: ['--version'],
		expectStdout: /^\d+\.\d+\.\d+/m,
	},
];
// #endregion

// #region ===== Live cloud chart fetch + extraction =====
/**
 * Clones cloud chart, renders it, returns invocations for every n8n
 * container in the rendered manifest.
 */
async function fetchCloudInvocations() {
	const cloneDir = await fs.mkdtemp(path.join(tmpdir(), 'n8n-smoke-cloud-'));
	try {
		echo(chalk.dim(`fetching ${config.cloud.repo}@${config.cloud.ref}...`));
		await $`gh repo clone ${config.cloud.repo} ${cloneDir} -- --depth=1 --branch=${config.cloud.ref} --quiet`;

		const chartDir = path.join(cloneDir, config.cloud.chartPath);
		const valuesFile = path.join(cloneDir, config.cloud.valuesPath);
		if (!(await fs.pathExists(chartDir))) {
			throw new Error(`chart not found at ${config.cloud.chartPath}`);
		}
		if (!(await fs.pathExists(valuesFile))) {
			throw new Error(`values file not found at ${config.cloud.valuesPath}`);
		}

		echo(chalk.dim(`rendering helm chart...`));
		const rendered = await $({ cwd: chartDir })`helm template . --values ${valuesFile}`;
		const docs = parseAllDocuments(rendered.stdout).map((d) => d.toJSON()).filter(Boolean);

		const invocations = [];
		for (const doc of docs) {
			if (!doc?.kind?.match(/^(StatefulSet|Deployment)$/)) continue;
			const podSpec = doc.spec?.template?.spec;
			if (!podSpec) continue;
			const podUser = podSpec.securityContext?.runAsUser;
			const podGroup = podSpec.securityContext?.runAsGroup;

			for (const c of podSpec.containers ?? []) {
				// Only the n8n image — skip sidecars (task-runner-launcher, wget probes, etc.)
				if (!c.image?.includes('n8nio/n8n') && !c.image?.includes('n8n:')) continue;
				if (!c.command?.length) continue;

				const user = c.securityContext?.runAsUser ?? podUser ?? 1000;
				const group = c.securityContext?.runAsGroup ?? podGroup ?? user;
				const baseArgs = [...(c.args ?? [])];
				// Append --help so the process terminates without trying to bind/connect.
				// Safe for any n8n CLI form (`n8n`, `n8n worker ...`, etc.).
				const args = [...c.command.slice(1), ...baseArgs, '--help'];

				invocations.push({
					name: `cloud helm — ${doc.kind} ${doc.metadata?.name} container "${c.name}"`,
					source: `${config.cloud.repo}@${config.cloud.ref}:${config.cloud.chartPath}`,
					user: `${user}:${group}`,
					entrypoint: c.command[0],
					args,
					expectStdout: /Available commands/,
				});
			}
		}
		return invocations;
	} finally {
		await fs.remove(cloneDir).catch(() => {});
	}
}
// #endregion

async function runInvocation(spec) {
	const dockerArgs = [
		'run',
		'--rm',
		'--user',
		spec.user,
		...(spec.entrypoint ? ['--entrypoint', spec.entrypoint] : []),
		config.image,
		...spec.args,
	];

	let result;
	try {
		result = await $`docker ${dockerArgs}`.timeout(config.timeoutMs);
	} catch (err) {
		echo(chalk.red(`✗ ${spec.name}`));
		echo(chalk.dim(`  source:  ${spec.source}`));
		echo(chalk.dim(`  command: docker ${dockerArgs.join(' ')}`));
		if (err.stderr) echo(chalk.dim(`  stderr:  ${String(err.stderr).slice(0, 800)}`));
		return false;
	}

	if (!spec.expectStdout.test(result.stdout)) {
		echo(chalk.red(`✗ ${spec.name}`));
		echo(chalk.dim(`  source:   ${spec.source}`));
		echo(chalk.dim(`  expected: ${spec.expectStdout}`));
		echo(chalk.dim(`  got:      ${result.stdout.slice(0, 500)}`));
		return false;
	}

	echo(chalk.green(`✓ ${spec.name}`));
	return true;
}

async function main() {
	const invocations = [...HARDCODED_INVOCATIONS];

	if (config.skipCloud) {
		echo(chalk.yellow('Skipping cloud chart fetch (SMOKE_SKIP_CLOUD=true)'));
	} else {
		try {
			const cloudInvocations = await fetchCloudInvocations();
			invocations.push(...cloudInvocations);
		} catch (err) {
			echo(chalk.red('Cloud chart fetch failed — cannot verify cloud invocation contract.'));
			echo(chalk.dim(`  ${err.message ?? err}`));
			echo(chalk.dim('  Set SMOKE_SKIP_CLOUD=true to skip if cloud read is unreachable.'));
			process.exit(1);
		}
	}

	echo(chalk.bold(`Smoke-testing ${config.image} against ${invocations.length} invocation(s)`));
	echo('');

	let allPassed = true;
	for (const spec of invocations) {
		const passed = await runInvocation(spec);
		if (!passed) allPassed = false;
	}

	echo('');
	if (!allPassed) {
		echo(chalk.red.bold('Smoke check failed. See above for details.'));
		process.exit(1);
	}
	echo(chalk.green.bold('All smoke checks passed.'));
}

await main();
