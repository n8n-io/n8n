import { execSync } from 'node:child_process';
import * as os from 'node:os';

/** One row of `qa_performance_metrics`. See `.github/CI-TELEMETRY.md`. */
export interface CiMetric {
	metric_name: string;
	value: number;
	unit: string | null;
	dimensions: Record<string, string | number> | null;
}

/** Credentials of the QA metrics webhook, from the reporter options or the env. */
export interface CiMetricsWebhook {
	url?: string;
	user?: string;
	password?: string;
}

export function resolveCiMetricsWebhook(
	overrides: CiMetricsWebhook = {},
	env: NodeJS.ProcessEnv = process.env,
): CiMetricsWebhook {
	return {
		url: overrides.url ?? env.QA_METRICS_WEBHOOK_URL,
		user: overrides.user ?? env.QA_METRICS_WEBHOOK_USER,
		password: overrides.password ?? env.QA_METRICS_WEBHOOK_PASSWORD,
	};
}

function gitFallback(command: string): string | null {
	try {
		return execSync(`git ${command}`, {
			encoding: 'utf8',
			stdio: ['pipe', 'pipe', 'ignore'],
		}).trim();
	} catch {
		return null;
	}
}

/** Context every telemetry payload carries, whatever measured it. */
export function ciMetricsContext() {
	const ref = process.env.GITHUB_REF ?? '';
	const prMatch = ref.match(/refs\/pull\/(\d+)/);
	const runId = process.env.GITHUB_RUN_ID ?? null;

	return {
		timestamp: new Date().toISOString(),
		git: {
			sha: (process.env.GITHUB_SHA ?? gitFallback('rev-parse HEAD'))?.slice(0, 8) ?? null,
			branch:
				process.env.GITHUB_HEAD_REF ??
				process.env.GITHUB_REF_NAME ??
				gitFallback('rev-parse --abbrev-ref HEAD'),
			pr: prMatch ? parseInt(prMatch[1], 10) : null,
		},
		ci: {
			runId,
			runUrl:
				runId && process.env.GITHUB_REPOSITORY
					? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${runId}`
					: null,
			workflow: process.env.GITHUB_WORKFLOW ?? null,
			job: process.env.GITHUB_JOB ?? null,
			attempt: process.env.GITHUB_RUN_ATTEMPT ? parseInt(process.env.GITHUB_RUN_ATTEMPT, 10) : null,
		},
		runner: {
			provider: !process.env.CI
				? 'local'
				: process.env.RUNNER_ENVIRONMENT === 'github-hosted'
					? 'github'
					: 'blacksmith',
			cpuCores: os.cpus().length,
			memoryGb: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
		},
	};
}

export type CiMetricsContext = ReturnType<typeof ciMetricsContext>;

export interface SendCiMetricsParams {
	/** Groups the metrics under one source, e.g. a test title or `a11y`. */
	benchmarkName: string;
	metrics: CiMetric[];
	webhook: CiMetricsWebhook;
	/** Prefix of the log lines, so a reader sees which reporter sent them. */
	logPrefix: string;
	/** Pass a shared context when several payloads belong to one run. */
	context?: CiMetricsContext;
}

/**
 * POSTs one benchmark's metrics to the QA metrics webhook and returns how many
 * landed.
 *
 * Best-effort: no webhook, missing credentials, a bad response and a network
 * failure all return 0 instead of throwing. Telemetry must never fail a run.
 */
export async function sendCiMetrics({
	benchmarkName,
	metrics,
	webhook,
	logPrefix,
	context,
}: SendCiMetricsParams): Promise<number> {
	if (!webhook.url || metrics.length === 0) return 0;
	if (!webhook.user || !webhook.password) {
		console.log(`${logPrefix} QA_METRICS_WEBHOOK_USER/PASSWORD not set, skipping.`);
		return 0;
	}

	const auth = Buffer.from(`${webhook.user}:${webhook.password}`).toString('base64');
	const payload = {
		...(context ?? ciMetricsContext()),
		benchmark_name: benchmarkName,
		metrics,
	};

	try {
		const response = await fetch(webhook.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${auth}`,
			},
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(30000),
		});

		if (!response.ok) {
			console.warn(
				`${logPrefix} Webhook failed (${response.status}) for "${benchmarkName}": ${metrics.length} metrics dropped`,
			);
			return 0;
		}
		return metrics.length;
	} catch (e) {
		console.warn(
			`${logPrefix} Failed to send metrics for "${benchmarkName}": ${(e as Error).message}`,
		);
		return 0;
	}
}
