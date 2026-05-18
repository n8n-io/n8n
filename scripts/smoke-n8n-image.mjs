#!/usr/bin/env node
/**
 * Smoke-tests the n8n docker image against the invocation patterns its
 * downstream consumers actually use, so that base-image / Dockerfile changes
 * that break those consumers fail at PR-time rather than in production.
 *
 * Each entry in INVOCATIONS represents a real container spec (command + args
 * + user) extracted from a downstream consumer. Update the entries when a
 * consumer's chart/template changes.
 *
 * Failure modes this catches:
 * - n8n binary moved out of /usr/local/bin (e.g. DHI 3.22 → 3.23 layout drift)
 * - n8n module relocated such that `node /absolute/path/n8n` can no longer
 *   load it
 * - default entrypoint regression (tini / docker-entrypoint.sh breakage)
 * - non-root user assumption violated
 */

import { $, echo, chalk } from 'zx';

$.verbose = false;
process.env.FORCE_COLOR = '1';

// #region ===== Configuration =====
const config = {
	image: process.env.SMOKE_IMAGE || 'n8nio/n8n:local',
	timeoutMs: Number(process.env.SMOKE_TIMEOUT_MS || 30_000),
};
// #endregion

// #region ===== Invocations =====
// Each entry mirrors a real downstream container spec. When a consumer
// changes their invocation, update the matching entry here.
const INVOCATIONS = [
	{
		name: 'n8n-cloud helm — main pod (node /usr/local/bin/n8n)',
		source: 'n8n-cloud/packages/middleware/n8napp/n8n/templates/main/statefulset.yaml',
		user: '1000:1000',
		entrypoint: 'node',
		args: ['/usr/local/bin/n8n', '--help'],
		expectStdout: /Available commands/,
	},
	{
		name: 'default image entrypoint (tini + docker-entrypoint.sh)',
		source: 'docker/images/n8n/Dockerfile',
		user: '1000:1000',
		entrypoint: null, // use image default
		args: ['--help'],
		expectStdout: /Available commands/,
	},
	{
		name: 'n8n binary directly at /usr/local/bin/n8n',
		source: 'docker/images/n8n/Dockerfile (FHS contract)',
		user: '1000:1000',
		entrypoint: '/usr/local/bin/n8n',
		args: ['--version'],
		expectStdout: /^\d+\.\d+\.\d+/m,
	},
];
// #endregion

async function runInvocation(spec) {
	const args = [
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
		result = await $`docker ${args}`.timeout(config.timeoutMs);
	} catch (err) {
		echo(chalk.red(`✗ ${spec.name}`));
		echo(chalk.dim(`  source: ${spec.source}`));
		echo(chalk.dim(`  command: docker ${args.join(' ')}`));
		if (err.stderr) echo(chalk.dim(`  stderr: ${String(err.stderr).slice(0, 800)}`));
		return false;
	}

	if (!spec.expectStdout.test(result.stdout)) {
		echo(chalk.red(`✗ ${spec.name}`));
		echo(chalk.dim(`  source: ${spec.source}`));
		echo(chalk.dim(`  expected stdout to match: ${spec.expectStdout}`));
		echo(chalk.dim(`  got: ${result.stdout.slice(0, 500)}`));
		return false;
	}

	echo(chalk.green(`✓ ${spec.name}`));
	return true;
}

async function main() {
	echo(chalk.bold(`Smoke-testing ${config.image} against ${INVOCATIONS.length} invocation pattern(s)`));
	echo('');

	let allPassed = true;
	for (const spec of INVOCATIONS) {
		const passed = await runInvocation(spec);
		if (!passed) allPassed = false;
	}

	echo('');
	if (!allPassed) {
		echo(chalk.red.bold('Smoke check failed. See above for details.'));
		echo(chalk.dim('If a consumer legitimately changed their invocation, update'));
		echo(chalk.dim('the matching INVOCATIONS entry in scripts/smoke-n8n-image.mjs.'));
		process.exit(1);
	}
	echo(chalk.green.bold('All smoke checks passed.'));
}

await main();
