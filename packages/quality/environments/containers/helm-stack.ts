import { K3sContainer, type StartedK3sContainer } from '@testcontainers/k3s';
import { exec as execCallback, execSync } from 'node:child_process';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { promisify } from 'node:util';

import { StartupDeadline } from './startup-deadline';
import { TEST_CONTAINER_IMAGES } from './test-containers';

const execAsync = promisify(execCallback);

const DEFAULT_K3S_IMAGE = 'rancher/k3s:v1.32.2-k3s1';
const DEFAULT_CHART_REPO = 'https://github.com/n8n-io/n8n-hosting.git';
// A tag, not a branch, so that a chart change cannot break this stack unseen.
const DEFAULT_CHART_REF = 'v2.0.0-rc.2';
const DEFAULT_EXAMPLE = 'standalone';
const N8N_NODE_PORT = 30080;
const HEALTH_POLL_INTERVAL_MS = 2_000;
const CONTAINERD_READY_TIMEOUT_MS = 30_000;
const K3S_STARTUP_TIMEOUT_MS = 120_000;
const COMMAND_TIMEOUT_MS = 600_000;

export interface HelmStackConfig {
	/** n8n Docker image to deploy (default: TEST_CONTAINER_IMAGES.n8n) */
	n8nImage?: string;
	/** K3s image (default: rancher/k3s:v1.32.2-k3s1) */
	k3sImage?: string;
	/** Git ref for the n8n-hosting repo (default: the pinned tag) */
	helmChartRef?: string;
	/** Git repo URL for the Helm chart (default: n8n-io/n8n-hosting) */
	helmChartRepo?: string;
	/** Total startup timeout in ms (default: 300_000) */
	startupTimeoutMs?: number;
	/** Chart example to install: a file name in `charts/n8n/examples`, without `.yaml` (default: standalone) */
	example?: string;
	/** Additional environment variables to inject into n8n pods via Helm set-flags (merge-last-wins over defaults) */
	env?: Record<string, string>;
}

export interface HelmStack {
	/** Base URL to access n8n running inside K3s */
	baseUrl: string;
	/** Stop the K3s container and clean up */
	stop: () => Promise<void>;
	/** Path to kubeconfig file (use with kubectl/helm from your terminal) */
	kubeConfigPath: string;
}

// -- Logging ------------------------------------------------------------------

function log(message: string) {
	const timestamp = new Date().toISOString().slice(11, 19);
	console.log(`[helm-stack ${timestamp}] ${message}`);
}

// -- Host command execution ---------------------------------------------------

/** Execute a shell command on the host with the given environment. Returns stdout or throws with stderr. */
async function execOnHost(
	cmd: string,
	env: NodeJS.ProcessEnv,
	description: string,
	deadline: StartupDeadline,
): Promise<string> {
	deadline.throwIfAborted();
	try {
		const { stdout } = await execAsync(cmd, {
			env,
			encoding: 'utf-8',
			timeout: Math.min(COMMAND_TIMEOUT_MS, Math.max(1, deadline.remainingMs)),
			signal: deadline.signal,
		});
		deadline.throwIfAborted();
		return stdout;
	} catch (error: unknown) {
		const stderr = (error as { stderr?: string }).stderr ?? '';
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`${description} failed:\n${stderr || message}`);
	}
}

// -- Image preloading (must run inside K3s containerd) ------------------------

async function preloadImage(
	container: StartedK3sContainer,
	imageName: string,
	deadline: StartupDeadline,
): Promise<void> {
	// Try crictl pull first (fast for public registry images like GHCR).
	// Falls back to docker save + ctr import for local-only images (e.g. n8nio/n8n:local).
	log(`Pulling ${imageName} inside K3s...`);
	const pullResult = await deadline.run(
		async () => await container.exec(['crictl', 'pull', imageName]),
	);
	if (pullResult.exitCode !== 0) {
		log('Registry pull failed, importing from local Docker...');
		const tarPath = `/tmp/n8n-helm-${Date.now()}.tar`;
		try {
			await execOnHost(
				`docker save ${imageName} -o ${tarPath}`,
				process.env,
				`Save ${imageName}`,
				deadline,
			);
			await execOnHost(
				`docker cp ${tarPath} ${container.getId()}:/tmp/n8n-image.tar`,
				process.env,
				`Copy ${imageName}`,
				deadline,
			);

			const importResult = await deadline.run(
				async () =>
					await container.exec([
						'ctr',
						'--namespace',
						'k8s.io',
						'images',
						'import',
						'/tmp/n8n-image.tar',
					]),
			);
			if (importResult.exitCode !== 0) {
				throw new Error(`ctr import failed: ${importResult.output}`);
			}
			await deadline.run(async () => await container.exec(['rm', '-f', '/tmp/n8n-image.tar']));
		} finally {
			try {
				unlinkSync(tarPath);
			} catch (cleanupError: unknown) {
				log(
					`Warning: failed to clean up temp file ${tarPath}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
				);
			}
		}
	}

	const { output } = await deadline.run(async () => await container.exec(['crictl', 'images']));
	log(`Available images after preload:\n${output}`);
}

// -- Chart download -----------------------------------------------------------

async function cloneChartToHost(
	repo: string,
	ref: string,
	deadline: StartupDeadline,
): Promise<string> {
	log(`Downloading chart from ${repo} @ ${ref}...`);
	const dir = mkdtempSync(join(tmpdir(), 'n8n-chart-'));
	const repoPath = repo.replace('https://github.com/', '').replace('.git', '');
	const tarUrl = `https://github.com/${repoPath}/archive/${ref}.tar.gz`;

	try {
		await execOnHost(
			`curl -fsSL "${tarUrl}" | tar xz -C "${dir}" --strip-components=1`,
			process.env,
			'Download Helm chart',
			deadline,
		);
	} catch (error) {
		try {
			execSync(`rm -rf "${dir}"`, { stdio: 'pipe' });
		} catch {
			// Best-effort cleanup.
		}
		throw error;
	}
	log('Chart downloaded');
	return dir;
}

// -- Example values file selection --------------------------------------------

/** The example, then the overlay that the chart CI installs it with. */
function resolveValuesFiles(chartDir: string, example: string): string[] {
	const chartPath = join(chartDir, 'charts', 'n8n');
	const files = [
		join(chartPath, 'examples', `${example}.yaml`),
		join(chartPath, 'ci', 'install', `${example}.yaml`),
	];
	const missing = files.find((file) => !existsSync(file));
	if (missing) throw new Error(`Unknown chart example "${example}": ${missing} not found`);
	return files;
}

// -- Helm install flags -------------------------------------------------------

function parseImageName(imageName: string): { repository: string; tag: string } {
	// Split on last colon to handle registry ports (e.g. localhost:5000/repo:tag)
	const lastColon = imageName.lastIndexOf(':');
	const hasTag = lastColon > 0 && !imageName.substring(lastColon).includes('/');
	return hasTag
		? { repository: imageName.substring(0, lastColon), tag: imageName.substring(lastColon + 1) }
		: { repository: imageName, tag: 'latest' };
}

function buildHelmSetFlags(
	image: { repository: string; tag: string; runnersRepository: string },
	baseUrl: string,
	envOverrides?: Record<string, string>,
): string[] {
	const env: Record<string, string> = {
		N8N_DIAGNOSTICS_ENABLED: 'false',
		N8N_DYNAMIC_BANNERS_ENABLED: 'false',
	};
	// License env vars from host (same pattern as testcontainers stack)
	for (const name of ['N8N_LICENSE_TENANT_ID', 'N8N_LICENSE_ACTIVATION_KEY', 'N8N_LICENSE_CERT']) {
		const value = process.env[name];
		if (value) env[name] = value;
	}
	Object.assign(env, envOverrides);

	// Dynamic overrides on top of the example and overlay values files (-f).
	return [
		`--set image.repository=${image.repository}`,
		`--set image.tag=${image.tag}`,
		`--set taskRunners.image.repository=${image.runnersRepository}`,
		// The chart defaults public URLs to https. This stack serves plain HTTP
		// on a NodePort. Webhook URLs follow the editor URL.
		`--set editor.url=${baseUrl}`,
		// --set-string because K8s env values must be strings
		...Object.entries(env).map(([name, value]) => `--set-string env.shared.${name}=${value}`),
	];
}

// -- Health check -------------------------------------------------------------

export async function pollHealthEndpoint(
	baseUrl: string,
	timeoutMs: number,
	signal?: AbortSignal,
): Promise<void> {
	const url = `${baseUrl}/healthz/readiness`;
	const startTime = Date.now();

	while (Date.now() - startTime < timeoutMs) {
		signal?.throwIfAborted();
		try {
			const response = await fetch(url, { signal });
			if (response.status === 200) {
				return;
			}
		} catch {
			if (signal?.aborted) signal.throwIfAborted();
		}
		await wait(HEALTH_POLL_INTERVAL_MS, { signal });
	}

	throw new Error(`n8n health check at ${url} did not return 200 within ${timeoutMs / 1000}s`);
}

// -- Main entry point ---------------------------------------------------------

export async function createHelmStack(config: HelmStackConfig = {}): Promise<HelmStack> {
	const {
		n8nImage = TEST_CONTAINER_IMAGES.n8n,
		k3sImage = DEFAULT_K3S_IMAGE,
		helmChartRef = DEFAULT_CHART_REF,
		helmChartRepo = DEFAULT_CHART_REPO,
		startupTimeoutMs = 300_000,
		example = DEFAULT_EXAMPLE,
		env: envOverrides,
	} = config;
	const startupDeadline = new StartupDeadline(startupTimeoutMs);

	const containerName = `n8n-helm-${example}-${Date.now().toString(36)}`;
	const { repository, tag } = parseImageName(n8nImage);
	// The runner image is built beside the n8n image with the same tag:
	// `ghcr.io/n8n-io/n8n` → `ghcr.io/n8n-io/runners`.
	const runnersRepository = repository.replace(/[^/]+$/, 'runners');
	const runnersImage = `${runnersRepository}:${tag}`;

	log('Starting K3s + Helm stack');
	log(`  Example: ${example}`);
	log(`  Container: ${containerName}`);
	log(`  n8n image: ${n8nImage}`);
	log(`  Runners image: ${runnersImage}`);
	log(`  K3s image: ${k3sImage}`);
	log(`  Chart: ${helmChartRepo} @ ${helmChartRef}`);

	let chartDir = '';
	let valuesFiles: string[];
	let k3s: StartedK3sContainer;
	try {
		// Step 1: Download the chart first, so that an unknown example fails before K3s starts
		chartDir = await cloneChartToHost(helmChartRepo, helmChartRef, startupDeadline);
		valuesFiles = resolveValuesFiles(chartDir, example);

		// Step 2: Start K3s with NodePort exposed (bypasses flaky kubectl port-forward)
		// Ryuk is disabled so the container survives process exit — clean up via stack:helm:clean.
		log('Starting K3s container (privileged)...');
		k3s = await new K3sContainer(k3sImage)
			.withName(containerName)
			.withLabels({ 'n8n.helm': 'true', 'n8n.helm.example': example })
			.withExposedPorts(N8N_NODE_PORT)
			.withStartupTimeout(Math.min(K3S_STARTUP_TIMEOUT_MS, startupDeadline.remainingMs))
			.start();
	} catch (error) {
		if (chartDir) rmSync(chartDir, { recursive: true, force: true });
		startupDeadline.dispose();
		throw error;
	}
	const hostPort = k3s.getMappedPort(N8N_NODE_PORT);
	const baseUrl = `http://localhost:${hostPort}`;
	log(`K3s started (NodePort ${N8N_NODE_PORT} -> host ${hostPort})`);

	// Step 3: Write kubeconfig to a stable path and merge into ~/.kube/config
	const kubeDir = join(homedir(), '.kube');
	mkdirSync(kubeDir, { recursive: true });
	const contextName = `n8n-helm-${example}`;
	const kubeConfigPath = join(kubeDir, `${contextName}.yaml`);

	// K3s names everything 'default' — rename to avoid clashing with existing contexts
	const rawKubeconfig = k3s.getKubeConfig();
	const namedKubeconfig = rawKubeconfig
		.replace(/\bname: default\b/g, `name: ${contextName}`)
		.replace(/\bcurrent-context: default\b/, `current-context: ${contextName}`)
		.replace(/\bcluster: default\b/g, `cluster: ${contextName}`)
		.replace(/\buser: default\b/g, `user: ${contextName}`);
	writeFileSync(kubeConfigPath, namedKubeconfig);

	// Merge into ~/.kube/config so kubectl works without KUBECONFIG env var
	const defaultKubeconfig = join(kubeDir, 'config');
	if (existsSync(defaultKubeconfig)) {
		copyFileSync(defaultKubeconfig, `${defaultKubeconfig}.bak`);
	}
	try {
		const merged = execSync('kubectl config view --flatten', {
			env: {
				...process.env,
				KUBECONFIG: existsSync(defaultKubeconfig)
					? `${kubeConfigPath}:${defaultKubeconfig}`
					: kubeConfigPath,
			},
			stdio: 'pipe',
			encoding: 'utf-8',
		});
		writeFileSync(defaultKubeconfig, merged);
		execSync(`kubectl config use-context ${contextName}`, { stdio: 'pipe' });
		log(`Kubeconfig merged into ~/.kube/config (context: ${contextName})`);
	} catch {
		log(`Warning: could not merge kubeconfig — use: export KUBECONFIG=${kubeConfigPath}`);
	}

	const env: NodeJS.ProcessEnv = { ...process.env, KUBECONFIG: kubeConfigPath };

	try {
		// Step 4: Wait for containerd readiness
		log('Waiting for containerd...');
		const deadline = Date.now() + CONTAINERD_READY_TIMEOUT_MS;
		while (Date.now() < deadline) {
			startupDeadline.throwIfAborted();
			const result = await startupDeadline.run(async () => await k3s.exec(['crictl', 'images']));
			if (result.exitCode === 0) break;
			await wait(HEALTH_POLL_INTERVAL_MS, { signal: startupDeadline.signal });
		}

		// Step 5: Preload the n8n and runner images into K3s containerd
		await preloadImage(k3s, n8nImage, startupDeadline);
		await preloadImage(k3s, runnersImage, startupDeadline);
		log('Images preloaded');

		// Step 6: Run the chart's own CI preparation script, so this stack follows the chart
		log('Creating Secrets and starting the Postgres and Redis fixtures...');
		await execOnHost(
			`cd "${chartDir}" && bash charts/n8n/ci/prepare-cluster.sh`,
			env,
			'Prepare cluster',
			startupDeadline,
		);

		// Step 7: Install the chart with the example, its overlay, and dynamic overrides
		log('Installing Helm chart (this may take a few minutes)...');
		const valuesFlags = valuesFiles.map((file) => `-f "${file}"`).join(' ');
		const setFlags = buildHelmSetFlags(
			{ repository, tag, runnersRepository },
			baseUrl,
			envOverrides,
		).join(' ');
		log(`Using values files: ${valuesFiles.join(', ')}`);
		const helmOutput = await execOnHost(
			`helm install n8n "${chartDir}/charts/n8n" ${valuesFlags} ${setFlags} --wait --timeout 5m`,
			env,
			'Helm install',
			startupDeadline,
		);
		log(`Helm install complete:\n${helmOutput.trim()}`);

		// Step 8: Patch service to NodePort so traffic goes through K3s's exposed port
		// (bypasses kubectl port-forward which silently breaks after many connections)
		log(`Patching n8n service to NodePort ${N8N_NODE_PORT}...`);
		await execOnHost(
			`kubectl patch svc n8n-main --type merge -p '{"spec":{"type":"NodePort","ports":[{"port":5678,"targetPort":5678,"nodePort":${N8N_NODE_PORT}}]}}'`,
			env,
			'Patch service to NodePort',
			startupDeadline,
		);

		// Step 9: Poll health endpoint
		log(`Polling ${baseUrl}/healthz/readiness...`);
		await pollHealthEndpoint(
			baseUrl,
			Math.min(startupDeadline.remainingMs, 120_000),
			startupDeadline.signal,
		);
		log(`n8n is ready at ${baseUrl}`);
		startupDeadline.dispose();

		return {
			baseUrl,
			kubeConfigPath,
			stop: async () => {
				log('Shutting down...');
				try {
					unlinkSync(kubeConfigPath);
				} catch {
					/* ignore */
				}
				try {
					execSync(`rm -rf "${chartDir}"`, { stdio: 'pipe' });
				} catch {
					/* ignore */
				}
				await k3s.stop();
				log('K3s stopped');
			},
		};
	} catch (error) {
		// Dump debug info from host kubectl
		try {
			const podStatus = await execOnHost(
				'kubectl get pods -o wide 2>/dev/null || true',
				env,
				'debug',
				startupDeadline,
			);
			console.error('\n--- Pod Status ---');
			console.error(podStatus);

			const podLogs = await execOnHost(
				'kubectl logs -l app.kubernetes.io/name=n8n --all-containers --tail=50 2>/dev/null || true',
				env,
				'debug',
				startupDeadline,
			);
			if (podLogs.trim()) {
				console.error('\n--- Pod Logs ---');
				console.error(podLogs);
			}

			const events = await execOnHost(
				'kubectl get events --sort-by=.lastTimestamp 2>/dev/null || true',
				env,
				'debug',
				startupDeadline,
			);
			console.error('\n--- Events ---');
			console.error(events);
			console.error('----------------\n');
		} catch {
			// Best-effort debugging output
		}

		try {
			unlinkSync(kubeConfigPath);
		} catch {
			/* ignore */
		}
		if (chartDir)
			try {
				execSync(`rm -rf "${chartDir}"`, { stdio: 'pipe' });
			} catch {
				/* ignore */
			}
		await k3s.stop();
		startupDeadline.dispose();
		throw error;
	}
}
