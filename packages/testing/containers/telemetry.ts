import { spawn } from 'child_process';
import * as os from 'os';

import type { StackConfig } from './services/types';

export interface StackTelemetryRecord {
	/** ISO timestamp when stack creation started */
	timestamp: string;

	/** Git context from environment */
	git: {
		sha: string;
		branch: string;
		pr?: number;
	};

	/** CI context from GitHub Actions environment */
	ci: {
		runId?: string;
		job?: string;
		workflow?: string;
		attempt?: number;
	};

	/** Runner info - provider detected from env vars, specs from runtime */
	runner: {
		provider: 'github' | 'blacksmith' | 'local';
		cpuCores: number;
		memoryGb: number;
	};

	/** Stack configuration */
	stack: {
		type: 'single' | 'queue' | 'multi-main';
		mains: number;
		workers: number;
		postgres: boolean;
		services: string[];
	};

	/** Timing metrics in milliseconds */
	timing: {
		total: number;
		network: number;
		n8nStartup: number;
		services: Record<string, number>;
	};

	/** Container counts */
	containers: {
		total: number;
		services: number;
		n8n: number;
	};

	/** Outcome */
	success: boolean;
	errorMessage?: string;
}

function getGitContext(): StackTelemetryRecord['git'] {
	const ref = process.env.GITHUB_REF ?? '';
	const prMatch = ref.match(/refs\/pull\/(\d+)/);

	return {
		sha: process.env.GITHUB_SHA?.slice(0, 8) ?? 'local',
		branch: process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME ?? 'local',
		pr: prMatch ? parseInt(prMatch[1], 10) : undefined,
	};
}

function getCIContext(): StackTelemetryRecord['ci'] {
	return {
		runId: process.env.GITHUB_RUN_ID,
		job: process.env.GITHUB_JOB,
		workflow: process.env.GITHUB_WORKFLOW,
		attempt: process.env.GITHUB_RUN_ATTEMPT
			? parseInt(process.env.GITHUB_RUN_ATTEMPT, 10)
			: undefined,
	};
}

function getRunnerProvider(): StackTelemetryRecord['runner']['provider'] {
	// Not in CI = local development
	if (!process.env.CI) {
		return 'local';
	}
	// GitHub-hosted runners explicitly identify themselves
	if (process.env.RUNNER_ENVIRONMENT === 'github-hosted') {
		return 'github';
	}
	// Everything else in CI is Blacksmith
	return 'blacksmith';
}

function getRunnerInfo(): StackTelemetryRecord['runner'] {
	const cpus = os.cpus();
	return {
		provider: getRunnerProvider(),
		cpuCores: cpus.length,
		memoryGb: Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 10) / 10,
	};
}

function inferStackType(config: StackConfig): 'single' | 'queue' | 'multi-main' {
	if ((config.mains ?? 1) > 1) return 'multi-main';
	if ((config.workers ?? 0) > 0) return 'queue';
	return 'single';
}

function inferPostgres(config: StackConfig): boolean {
	const isQueueMode = (config.mains ?? 1) > 1 || (config.workers ?? 0) > 0;
	const hasKeycloak = config.services?.includes('keycloak') ?? false;
	return (config.postgres ?? false) || isQueueMode || hasKeycloak;
}

export class TelemetryRecorder {
	private startTimestamp = Date.now();
	private startPerf = performance.now();
	private networkTime = 0;
	private n8nStartupTime = 0;
	private serviceTimings: Record<string, number> = {};
	private serviceCount = 0;
	private n8nCount = 0;

	constructor(private config: StackConfig) {}

	recordNetwork(durationMs: number): void {
		this.networkTime = durationMs;
	}

	recordService(name: string, durationMs: number): void {
		this.serviceTimings[name] = durationMs;
		this.serviceCount++;
	}

	recordN8nStartup(durationMs: number, count: number): void {
		this.n8nStartupTime = durationMs;
		this.n8nCount = count;
	}

	private buildRecord(success: boolean, errorMessage?: string): StackTelemetryRecord {
		return {
			timestamp: new Date(this.startTimestamp).toISOString(),
			git: getGitContext(),
			ci: getCIContext(),
			runner: getRunnerInfo(),
			stack: {
				type: inferStackType(this.config),
				mains: this.config.mains ?? 1,
				workers: this.config.workers ?? 0,
				postgres: inferPostgres(this.config),
				services: [...(this.config.services ?? [])],
			},
			timing: {
				total: Math.round(performance.now() - this.startPerf),
				network: this.networkTime,
				n8nStartup: this.n8nStartupTime,
				services: { ...this.serviceTimings },
			},
			containers: {
				total: this.serviceCount + this.n8nCount,
				services: this.serviceCount,
				n8n: this.n8nCount,
			},
			success,
			errorMessage,
		};
	}

	/**
	 * Flush telemetry - outputs based on environment configuration
	 *
	 * Output modes:
	 * - CONTAINER_TELEMETRY_WEBHOOK: Send via detached process (non-blocking, survives parent exit)
	 * - CONTAINER_TELEMETRY_VERBOSE=1: Full breakdown + elapsed logs (via utils.ts)
	 * - Default: One-liner summary only
	 */
	flush(success: boolean, errorMessage?: string): void {
		const record = this.buildRecord(success, errorMessage);

		const isVerbose = process.env.CONTAINER_TELEMETRY_VERBOSE === '1';
		const webhookUrl = process.env.CONTAINER_TELEMETRY_WEBHOOK;

		if (webhookUrl) {
			this.sendToWebhook(record, webhookUrl);
		}

		if (isVerbose) {
			console.log(JSON.stringify(record, null, 2));
		} else {
			this.printSummaryLine(record);
		}
	}

	private printSummaryLine(record: StackTelemetryRecord): void {
		const time = this.formatMs(record.timing.total);
		const containers = record.containers.total;
		const services = record.stack.services.length;

		if (record.success) {
			const serviceInfo = services > 0 ? `, ${services} services` : '';
			console.log(`\x1b[32m✓\x1b[0m Stack ready (${time}, ${containers} containers${serviceInfo})`);
		} else {
			console.log(`\x1b[31m✗\x1b[0m Stack failed: ${record.errorMessage} (${time})`);
		}
	}

	/**
	 * Send telemetry via a detached child process.
	 * The process runs independently and survives parent exit, ensuring delivery
	 * even when the main process throws/exits immediately after flush().
	 */
	private sendToWebhook(record: StackTelemetryRecord, webhookUrl: string): void {
		const payload = JSON.stringify(record);
		const script = `
			fetch(process.argv[1], {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: process.argv[2]
			}).catch(() => process.exit(1));
		`;

		const child = spawn(process.execPath, ['-e', script, webhookUrl, payload], {
			detached: true,
			stdio: 'ignore',
		});
		child.unref();
	}

	private formatMs(ms: number): string {
		if (ms < 1000) return `${ms.toFixed(0)}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}
}

export function createTelemetryRecorder(config: StackConfig): TelemetryRecorder {
	return new TelemetryRecorder(config);
}