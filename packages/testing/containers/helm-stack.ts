import { K3sContainer, type StartedK3sContainer } from '@testcontainers/k3s';
import { execSync } from 'node:child_process';
import { mkdtempSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

import { TEST_CONTAINER_IMAGES } from './test-containers';

const DEFAULT_K3S_IMAGE = 'rancher/k3s:v1.32.2-k3s1';
const DEFAULT_CHART_REPO = 'https://github.com/n8n-io/n8n-hosting.git';
const DEFAULT_CHART_REF = 'krider2010/helm-chart-update';
const N8N_NODE_PORT = 30080;

export type HelmStackMode = 'standalone' | 'queue';

export interface HelmStackConfig {
	/** n8n Docker image to deploy (default: TEST_CONTAINER_IMAGES.n8n) */
	n8nImage?: string;
	/** K3s image (default: rancher/k3s:v1.32.2-k3s1) */
	k3sImage?: string;
	/** Git ref for the n8n-hosting repo (default: krider2010/helm-chart-update) */
	helmChartRef?: string;
	/** Git repo URL for the Helm chart (default: n8n-io/n8n-hosting) */
	helmChartRepo?: string;
	/** Total startup timeout in ms (default: 300_000) */
	startupTimeoutMs?: number;
	/** Deployment mode: standalone (SQLite) or queue (PostgreSQL + Redis + workers) */
	mode?: HelmStackMode;
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

function run(cmd: string, env: NodeJS.ProcessEnv, description: string): string {
	try {
		return execSync(cmd, { env, stdio: 'pipe', encoding: 'utf-8', timeout: 600_000 });
	} catch (error: unknown) {
		const stderr = (error as { stderr?: string }).stderr ?? '';
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`${description} failed:\n${stderr || message}`);
	}
}

// -- Image preloading (must run inside K3s containerd) ------------------------

async function preloadImage(container: StartedK3sContainer, imageName: string): Promise<void> {
	// Try crictl pull first (fast for public registry images like GHCR).
	// Falls back to docker save + ctr import for local-only images (e.g. n8nio/n8n:local).
	log(`Pulling ${imageName} inside K3s...`);
	const pullResult = await container.exec(['crictl', 'pull', imageName]);
	if (pullResult.exitCode !== 0) {
		log(`Registry pull failed, importing from local Docker...`);
		const tarPath = `/tmp/n8n-helm-${Date.now()}.tar`;
		try {
			execSync(`docker save ${imageName} -o ${tarPath}`, { stdio: 'pipe' });
			execSync(`docker cp ${tarPath} ${container.getId()}:/tmp/n8n-image.tar`, {
				stdio: 'pipe',
			});

			const importResult = await container.exec([
				'ctr',
				'--namespace',
				'k8s.io',
				'images',
				'import',
				'/tmp/n8n-image.tar',
			]);
			if (importResult.exitCode !== 0) {
				throw new Error(`ctr import failed: ${importResult.output}`);
			}
			await container.exec(['rm', '-f', '/tmp/n8n-image.tar']);
		} finally {
			try {
				unlinkSync(tarPath);
			} catch {
				/* ignore */
			}
		}
	}

	const { output } = await container.exec(['crictl', 'images']);
	log(`Available images after preload:\n${output}`);
}

// -- Chart download -----------------------------------------------------------

function cloneChartToHost(repo: string, ref: string): string {
	log(`Downloading chart from ${repo} @ ${ref}...`);
	const dir = mkdtempSync(join(tmpdir(), 'n8n-chart-'));
	const repoPath = repo.replace('https://github.com/', '').replace('.git', '');
	const tarUrl = `https://github.com/${repoPath}/archive/refs/heads/${ref}.tar.gz`;

	execSync(`curl -fsSL "${tarUrl}" | tar xz -C "${dir}" --strip-components=1`, { stdio: 'pipe' });
	log('Chart downloaded');
	return dir;
}

// -- Helm install flags -------------------------------------------------------

function buildHelmSetFlags(imageName: string, mode: HelmStackMode, baseUrl: string): string[] {
	const [repository, tag = 'latest'] = imageName.split(':');

	// Only override what differs from the chart's values.yaml defaults
	const flags = [
		// Image
		`--set image.repository=${repository}`,
		`--set image.tag=${tag}`,
		// Secrets (chart defaults are placeholder values)
		'--set secretRefs.env.N8N_ENCRYPTION_KEY=test-encryption-key-for-e2e-testing',
		'--set secretRefs.env.N8N_HOST=localhost',
		// E2E-specific env vars (--set-string because K8s env values must be strings)
		'--set config.extraEnv[0].name=E2E_TESTS --set-string config.extraEnv[0].value=true',
		'--set config.extraEnv[1].name=NODE_ENV --set-string config.extraEnv[1].value=development',
		'--set config.extraEnv[2].name=N8N_DIAGNOSTICS_ENABLED --set-string config.extraEnv[2].value=false',
		'--set config.extraEnv[3].name=N8N_DYNAMIC_BANNERS_ENABLED --set-string config.extraEnv[3].value=false',
		// WEBHOOK_URL tells n8n its externally-accessible address (for invitation links, webhooks, etc.)
		`--set config.extraEnv[4].name=WEBHOOK_URL --set-string config.extraEnv[4].value=${baseUrl}`,
	];

	// License env vars from host (same pattern as testcontainers stack)
	let envIdx = 5;
	const licenseTenantId = process.env.N8N_LICENSE_TENANT_ID;
	if (licenseTenantId) {
		flags.push(
			`--set config.extraEnv[${envIdx}].name=N8N_LICENSE_TENANT_ID --set-string config.extraEnv[${envIdx}].value=${licenseTenantId}`,
		);
		envIdx++;
	}
	const licenseActivationKey = process.env.N8N_LICENSE_ACTIVATION_KEY;
	if (licenseActivationKey) {
		flags.push(
			`--set config.extraEnv[${envIdx}].name=N8N_LICENSE_ACTIVATION_KEY --set-string config.extraEnv[${envIdx}].value=${licenseActivationKey}`,
		);
		envIdx++;
	}
	const licenseCert = process.env.N8N_LICENSE_CERT;
	if (licenseCert) {
		flags.push(
			`--set config.extraEnv[${envIdx}].name=N8N_LICENSE_CERT --set-string config.extraEnv[${envIdx}].value=${licenseCert}`,
		);
	}

	if (mode === 'standalone') {
		// Chart defaults to queue mode — override for standalone
		flags.push(
			'--set queueMode.enabled=false',
			'--set database.type=sqlite',
			'--set database.useExternal=false',
			'--set redis.enabled=false',
			'--set persistence.enabled=true',
			'--set persistence.size=1Gi',
		);
	} else {
		// Queue mode: only override the hosts to point at our Bitnami services
		flags.push('--set database.host=postgresql', '--set redis.host=redis-master');
	}

	return flags;
}

// -- Queue mode infrastructure ------------------------------------------------

function deployQueueInfrastructure(env: NodeJS.ProcessEnv): void {
	log('Adding Bitnami Helm repo...');
	run(
		'helm repo add bitnami https://charts.bitnami.com/bitnami && helm repo update',
		env,
		'Add Bitnami repo',
	);

	log('Deploying PostgreSQL...');
	run(
		'helm install postgresql bitnami/postgresql --set auth.username=n8n --set auth.password=n8n-test-password --set auth.database=n8n --set primary.resources.requests.cpu=100m --set primary.resources.requests.memory=256Mi --set primary.resources.limits.cpu=500m --set primary.resources.limits.memory=512Mi --wait --timeout 3m',
		env,
		'Deploy PostgreSQL',
	);
	log('PostgreSQL deployed');

	log('Deploying Redis...');
	run(
		"helm install redis bitnami/redis --set architecture=standalone --set auth.enabled=false --set-json 'master.disableCommands=[]' --set master.resources.requests.cpu=100m --set master.resources.requests.memory=128Mi --set master.resources.limits.cpu=250m --set master.resources.limits.memory=256Mi --wait --timeout 3m",
		env,
		'Deploy Redis',
	);
	log('Redis deployed');

	run(
		'kubectl create secret generic n8n-db-password --from-literal=password=n8n-test-password',
		env,
		'Create DB password secret',
	);
}

// -- Health check -------------------------------------------------------------

async function pollHealthEndpoint(baseUrl: string, timeoutMs: number): Promise<void> {
	const url = `${baseUrl}/healthz/readiness`;
	const startTime = Date.now();

	while (Date.now() - startTime < timeoutMs) {
		try {
			const response = await fetch(url);
			if (response.status === 200) {
				return;
			}
		} catch {
			// Retry
		}
		await wait(2000);
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
		mode = 'standalone',
	} = config;

	log('Starting K3s + Helm stack');
	log(`  Mode: ${mode}`);
	log(`  n8n image: ${n8nImage}`);
	log(`  K3s image: ${k3sImage}`);
	log(`  Chart: ${helmChartRepo} @ ${helmChartRef}`);

	// Step 1: Start K3s with NodePort exposed (bypasses flaky kubectl port-forward)
	log('Starting K3s container (privileged)...');
	const k3s = await new K3sContainer(k3sImage)
		.withExposedPorts(N8N_NODE_PORT)
		.withStartupTimeout(120_000)
		.start();
	const hostPort = k3s.getMappedPort(N8N_NODE_PORT);
	const baseUrl = `http://localhost:${hostPort}`;
	log(`K3s started (NodePort ${N8N_NODE_PORT} -> host ${hostPort})`);

	// Step 2: Write kubeconfig so host helm/kubectl can talk to K3s
	const kubeConfigPath = join(tmpdir(), `helm-kubeconfig-${Date.now()}.yaml`);
	writeFileSync(kubeConfigPath, k3s.getKubeConfig());
	const env: NodeJS.ProcessEnv = { ...process.env, KUBECONFIG: kubeConfigPath };
	log(`Kubeconfig written to ${kubeConfigPath}`);

	let chartDir = '';

	try {
		// Step 3: Wait for containerd readiness
		log('Waiting for containerd...');
		const deadline = Date.now() + 30_000;
		while (Date.now() < deadline) {
			const result = await k3s.exec(['crictl', 'images']);
			if (result.exitCode === 0) break;
			await wait(2000);
		}

		// Step 4: Preload n8n image into K3s containerd
		await preloadImage(k3s, n8nImage);
		log('Image preloaded');

		// Step 5: Download chart to host
		chartDir = cloneChartToHost(helmChartRepo, helmChartRef);

		// Step 6: Deploy queue infrastructure if needed
		if (mode === 'queue') {
			deployQueueInfrastructure(env);
		}

		// Step 7: Install n8n chart with WEBHOOK_URL baked in (no post-install rollout needed)
		log('Installing Helm chart (this may take a few minutes)...');
		const setFlags = buildHelmSetFlags(n8nImage, mode, baseUrl).join(' ');
		const helmOutput = run(
			`helm install n8n "${chartDir}/charts/n8n" ${setFlags} --wait --timeout 5m`,
			env,
			'Helm install',
		);
		log(`Helm install complete:\n${helmOutput.trim()}`);

		// Step 8: Patch service to NodePort so traffic goes through K3s's exposed port
		// (bypasses kubectl port-forward which silently breaks after many connections)
		log(`Patching n8n service to NodePort ${N8N_NODE_PORT}...`);
		run(
			`kubectl patch svc n8n-main --type merge -p '{"spec":{"type":"NodePort","ports":[{"port":5678,"targetPort":5678,"nodePort":${N8N_NODE_PORT}}]}}'`,
			env,
			'Patch service to NodePort',
		);

		// Step 9: Poll health endpoint
		log(`Polling ${baseUrl}/healthz/readiness...`);
		await pollHealthEndpoint(baseUrl, Math.min(startupTimeoutMs, 120_000));
		log(`n8n is ready at ${baseUrl}`);

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
			const podStatus = run('kubectl get pods -o wide 2>/dev/null || true', env, 'debug');
			console.error('\n--- Pod Status ---');
			console.error(podStatus);

			const podLogs = run(
				'kubectl logs -l app.kubernetes.io/name=n8n --tail=50 2>/dev/null || true',
				env,
				'debug',
			);
			if (podLogs.trim()) {
				console.error('\n--- Pod Logs ---');
				console.error(podLogs);
			}

			const events = run(
				'kubectl get events --sort-by=.lastTimestamp 2>/dev/null || true',
				env,
				'debug',
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
		throw error;
	}
}
