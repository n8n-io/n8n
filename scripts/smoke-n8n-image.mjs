#!/usr/bin/env node
// Fails if the built n8n image breaks an invocation pattern a real consumer
// uses. The cloud invocation is pulled live from n8n-cloud's helm chart so
// the test doesn't drift from what cloud actually deploys.

import { $, echo, chalk, fs, tmpdir } from 'zx';
import path from 'node:path';
import { parseAllDocuments } from 'yaml';

$.verbose = false;
process.env.FORCE_COLOR = '1';

const IMAGE = process.env.SMOKE_IMAGE || 'n8nio/n8n:local';
const EXPECT = /Available commands/;
const CLOUD = {
	repo: 'n8n-io/n8n-cloud',
	ref: process.env.CLOUD_CHART_REF || 'main',
	chartPath:
		process.env.CLOUD_CHART_PATH || 'packages/instance-controller/charts/n8napp/n8n',
	valuesPath:
		process.env.CLOUD_CHART_VALUES ||
		'packages/instance-controller/charts/n8napp/values-v1.yaml',
};

async function fetchCloudInvocations() {
	const dir = await fs.mkdtemp(path.join(tmpdir(), 'n8n-smoke-cloud-'));
	try {
		await $`gh repo clone ${CLOUD.repo} ${dir} -- --depth=1 --branch=${CLOUD.ref} --quiet`;
		const { stdout } = await $({
			cwd: path.join(dir, CLOUD.chartPath),
		})`helm template . --values ${path.join(dir, CLOUD.valuesPath)}`;

		return parseAllDocuments(stdout)
			.map((d) => d.toJSON())
			.flatMap((doc) => {
				if (!/^(StatefulSet|Deployment)$/.test(doc?.kind ?? '')) return [];
				const pod = doc.spec?.template?.spec ?? {};
				return (pod.containers ?? [])
					.filter((c) => c.image?.includes('n8n') && c.command?.length)
					.map((c) => ({
						name: `cloud ${doc.kind} ${doc.metadata.name}/${c.name}`,
						user: String(c.securityContext?.runAsUser ?? pod.securityContext?.runAsUser ?? 1000),
						entrypoint: c.command[0],
						// --help makes the process terminate without bind/connect.
						args: [...c.command.slice(1), ...(c.args ?? []), '--help'],
					}));
			});
	} finally {
		await fs.remove(dir).catch(() => {});
	}
}

async function run({ name, user, entrypoint, args }) {
	const dockerArgs = ['run', '--rm', '--user', `${user}:${user}`];
	if (entrypoint) dockerArgs.push('--entrypoint', entrypoint);
	dockerArgs.push(IMAGE, ...args);

	try {
		const { stdout } = await $`docker ${dockerArgs}`;
		if (!EXPECT.test(stdout)) throw new Error(`output did not match ${EXPECT}`);
		echo(chalk.green(`✓ ${name}`));
		return true;
	} catch (err) {
		echo(chalk.red(`✗ ${name}`));
		echo(chalk.dim(`  ${(err.stderr ?? err.message ?? '').slice(0, 600)}`));
		return false;
	}
}

const invocations = [
	{ name: 'default entrypoint', user: '1000', entrypoint: null, args: ['--help'] },
	...(process.env.SMOKE_SKIP_CLOUD === 'true' ? [] : await fetchCloudInvocations()),
];

echo(chalk.bold(`Smoke-testing ${IMAGE} (${invocations.length} invocations)`));
const ok = (await Promise.all(invocations.map(run))).every(Boolean);
if (!ok) process.exit(1);
