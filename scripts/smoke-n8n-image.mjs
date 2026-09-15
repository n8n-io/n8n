#!/usr/bin/env node
// Verifies the built n8n image still works for the ways n8n-cloud launches
// it. The container spec is pulled live from n8n-cloud's helm chart so this
// test stays in sync with what cloud actually deploys.

import { $, echo, chalk, fs, tmpdir } from 'zx';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAllDocuments } from 'yaml';

$.verbose = false;
process.env.FORCE_COLOR = '1';

const IMAGE = process.env.SMOKE_IMAGE || 'n8nio/n8n:local';
// Runners images to exec-check. Tracks DOCKER_BUILD_DISTROLESS so the same
// flag drives both build and check. SMOKE_RUNNERS_IMAGES (comma-separated)
// overrides both.
const RUNNERS_IMAGES = process.env.SMOKE_RUNNERS_IMAGES
	? process.env.SMOKE_RUNNERS_IMAGES.split(',')
			.map((s) => s.trim())
			.filter(Boolean)
	: [
			'n8nio/runners:local',
			...(process.env.DOCKER_BUILD_DISTROLESS === 'true' ? ['n8nio/runners:local-distroless'] : []),
		];
const TIMEOUT = '45s';
// Matches an n8n runtime image ref (e.g. `n8nio/n8n:2.4.4`, `ghcr.io/n8n-io/n8n@sha256:…`)
// but not sidecars like `n8nio/runners:…` or controller images that happen to contain "n8n".
const N8N_IMAGE_REF = /\/n8n(:|@)/;
// `bin/n8n` short-circuits on `--version` regardless of subcommand
// (checks process.argv.slice(-1)[0]), so this works for `n8n` and `n8n worker` alike.
const VERSION_FLAG = '--version';
const VERSION_OUTPUT = /^\d+\.\d+\.\d+/m;
const CLOUD = {
	repo: 'n8n-io/n8n-cloud',
	ref: process.env.CLOUD_CHART_REF || 'main',
	// Owned by n8n-cloud — override via env if cloud reorganises. Cross-reference:
	// n8n-cloud:packages/instance-controller/charts/n8napp/{n8n,values-v1.yaml}
	chartPath: process.env.CLOUD_CHART_PATH || 'packages/instance-controller/charts/n8napp/n8n',
	valuesPath:
		process.env.CLOUD_CHART_VALUES || 'packages/instance-controller/charts/n8napp/values-v1.yaml',
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
					.filter((c) => N8N_IMAGE_REF.test(c.image ?? ''))
					.map((c) => ({
						name: `n8n-cloud: ${doc.kind} ${doc.metadata.name} / ${c.name}`,
						user: String(c.securityContext?.runAsUser ?? pod.securityContext?.runAsUser ?? 1000),
						// If the chart sets `command`, override entrypoint; otherwise let the
						// image's ENTRYPOINT run with the args.
						entrypoint: c.command?.[0],
						args: [...(c.command?.slice(1) ?? []), ...(c.args ?? []), VERSION_FLAG],
					}));
			});
	} finally {
		await fs.remove(dir).catch(() => {});
	}
}

// Do not add to this list. The dedicated-lockfile deploy materializes every
// workspace package once; the legacy deploy split @n8n/ai-utilities in two
// because @langchain/community resolved its optional peers differently per
// importer.
const KNOWN_DUPLICATED = new Map();

function reportFailure(name, err) {
	echo(chalk.red(`✗ ${name}`));
	echo(chalk.dim(`  ${(err.stderr ?? err.message ?? '').slice(0, 1200)}`));
	return false;
}

// `pnpm deploy` materializes a workspace package more than once when a peer
// resolves differently per importer, breaking cross-package `instanceof`.
async function runWorkspaceDedupCheck() {
	const name = 'workspace packages materialized once in image';
	try {
		const { stdout } = await $({
			timeout: TIMEOUT,
		})`docker run --rm --entrypoint ls ${IMAGE} /usr/local/lib/node_modules/n8n/node_modules/.pnpm`;
		const variants = new Map();
		for (const entry of stdout.split('\n')) {
			// pnpm names an injected workspace package after its `file:` path, which the
			// dedicated-lockfile deploy writes as an absolute URL:
			// `<name>@file++++home+runner+…+packages+<dir>_<hash>`.
			const match = entry.match(/^(.+?)@file\+.*packages\+/);
			if (!match) continue;
			const pkg = match[1].replace('+', '/');
			variants.set(pkg, [...(variants.get(pkg) ?? []), entry]);
		}

		if (variants.size === 0) {
			throw new Error(
				'no injected workspace packages matched — the .pnpm depPath encoding may have changed; update the regex',
			);
		}
		for (const [pkg, expected] of KNOWN_DUPLICATED) {
			const found = variants.get(pkg)?.length ?? 0;
			if (found < expected) {
				throw new Error(
					`expected ${expected} copies of ${pkg} but found ${found} — if the duplication was fixed, update KNOWN_DUPLICATED`,
				);
			}
		}
		const duplicated = [...variants].filter(
			([pkg, dirs]) => dirs.length > (KNOWN_DUPLICATED.get(pkg) ?? 1),
		);
		if (duplicated.length > 0) {
			const details = duplicated.map(([pkg, dirs]) => `${pkg}:\n    ${dirs.join('\n    ')}`);
			throw new Error(
				'workspace package(s) materialized more than once — align the offending peer ' +
					`dependency's version across the workspace:\n  ${details.join('\n  ')}`,
			);
		}
		echo(chalk.green(`✓ ${name} (${variants.size} injected packages)`));
		return true;
	} catch (err) {
		return reportFailure(name, err);
	}
}

// The image compiles this binding from source, so a bad build shows only at
// require() time. This is the same script the release build uses.
const KAFKA_CHECK = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../.github/scripts/docker/kafka-native-smoke-check.mjs',
);
const EXPECTED_PNPM_VERSION = (await fs.readJson(
	path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../package.json'),
)).packageManager.replace('pnpm@', '');

async function runKafkaBindingCheck() {
	const name = 'kafka native binding loads in image';
	try {
		await $({
			timeout: TIMEOUT,
		})`docker run --rm --entrypoint node -v ${`${KAFKA_CHECK}:/tmp/kafka-check.mjs:ro`} ${IMAGE} /tmp/kafka-check.mjs`;
		echo(chalk.green(`✓ ${name}`));
		return true;
	} catch (err) {
		return reportFailure(name, err);
	}
}

// Interpreter paths as launched by docker/images/runners/n8n-task-runners.json.
// The runners images assemble node/python by copying binaries across images, so a
// missing shared library only surfaces at exec time.
const RUNNER_INTERPRETERS = [
	['/usr/local/bin/node', '--version'],
	['/opt/runners/task-runner-python/.venv/bin/python', '--version'],
];

async function runRunnersInterpreterCheck(image) {
	const name = `runner interpreters exec in ${image}`;
	try {
		for (const [entrypoint, arg] of RUNNER_INTERPRETERS) {
			await $({ timeout: TIMEOUT })`docker run --rm --entrypoint ${entrypoint} ${image} ${arg}`;
		}
		echo(chalk.green(`✓ ${name}`));
		return true;
	} catch (err) {
		return reportFailure(name, err);
	}
}

async function runRunnersPnpmCheck(image) {
	const name = `pnpm ${EXPECTED_PNPM_VERSION} runs offline in ${image}`;
	try {
		const { stdout } = await $({
			timeout: TIMEOUT,
		})`docker run --rm --network none --entrypoint pnpm ${image} --version`;
		if (stdout.trim() !== EXPECTED_PNPM_VERSION) {
			throw new Error(`expected ${EXPECTED_PNPM_VERSION}, got ${stdout.trim()}`);
		}
		echo(chalk.green(`✓ ${name}`));
		return true;
	} catch (err) {
		return reportFailure(name, err);
	}
}

// Derived images add packages with `pnpm add` in the JS runner directory (docs:
// "Adding extra dependencies"). pnpm prunes packages the recorded importer no
// longer needs, so a deploy that records the closure differently makes this
// delete the runner instead of extending it. Fails when pnpm cannot run, prunes,
// or the added package and the runner no longer both resolve.
// `minimum-release-age=0` mirrors the Dockerfile: the check is about the closure
// shape, not about how fresh the latest uuid is.
const RUNNER_JS_DIR = '/opt/runners/task-runner-javascript';

async function runRunnersExtensionCheck(image) {
	const name = `pnpm add extends the JS runner in ${image}`;
	const script = [
		`cd ${RUNNER_JS_DIR}`,
		'before=$(ls node_modules/.pnpm | wc -l)',
		'pnpm add uuid --save-prod --no-lockfile --config.minimum-release-age=0',
		'after=$(ls node_modules/.pnpm | wc -l)',
		'[ "$after" -gt "$before" ] || { echo "pnpm add pruned the closure: $before -> $after packages"; exit 1; }',
		`node -e "require('uuid'); require('moment'); require.resolve('n8n-core')"`,
	].join(' && ');
	try {
		await $({
			timeout: '120s',
		})`docker run --rm --user root --entrypoint sh ${image} -c ${script}`;
		echo(chalk.green(`✓ ${name}`));
		return true;
	} catch (err) {
		return reportFailure(name, err);
	}
}

async function run({ name, user, entrypoint, args }) {
	const dockerArgs = ['run', '--rm', '--user', `${user}:${user}`];
	if (entrypoint) dockerArgs.push('--entrypoint', entrypoint);
	dockerArgs.push(IMAGE, ...args);

	try {
		const { stdout } = await $({ timeout: TIMEOUT })`docker ${dockerArgs}`;
		if (!VERSION_OUTPUT.test(stdout)) {
			throw new Error(`unexpected stdout: ${stdout.slice(0, 200)}`);
		}
		echo(chalk.green(`✓ ${name}`));
		return true;
	} catch (err) {
		return reportFailure(name, err);
	}
}

const cloud = process.env.SMOKE_SKIP_CLOUD === 'true' ? [] : await fetchCloudInvocations();
if (process.env.SMOKE_SKIP_CLOUD !== 'true' && cloud.length === 0) {
	echo(chalk.red('Cloud chart rendered no n8n containers — chart structure may have moved.'));
	echo(
		chalk.dim('  Check CLOUD_CHART_PATH / CLOUD_CHART_VALUES, or run with SMOKE_SKIP_CLOUD=true.'),
	);
	process.exit(1);
}

const invocations = [
	{ name: 'n8n image default entrypoint', user: '1000', entrypoint: null, args: [VERSION_FLAG] },
	...cloud,
];

echo(chalk.bold(`Verifying ${IMAGE} against ${invocations.length} deployment pattern(s)`));
const ok = (
	await Promise.all([
		...invocations.map(run),
		runWorkspaceDedupCheck(),
		runKafkaBindingCheck(),
		...RUNNERS_IMAGES.map(runRunnersInterpreterCheck),
		// The distroless image ships no shell or pnpm; only the standard image is extendable.
		...RUNNERS_IMAGES.filter((image) => !image.endsWith('-distroless')).map(runRunnersPnpmCheck),
		...RUNNERS_IMAGES.filter((image) => !image.endsWith('-distroless')).map(
			runRunnersExtensionCheck,
		),
	])
).every(Boolean);
if (!ok) process.exit(1);
