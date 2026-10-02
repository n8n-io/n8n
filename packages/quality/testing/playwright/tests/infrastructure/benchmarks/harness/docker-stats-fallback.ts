/**
 * Periodic `docker stats` sampler — fallback for environments where cAdvisor
 * can't see sibling containers (notably Docker Desktop on macOS, where its
 * docker factory fails to register against the daemon socket).
 *
 * IO/Net are cumulative-since-container-start in `docker stats`; rates are
 * computed from first-vs-last sample inside the measurement window.
 */
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';

import type { ContainerStat } from '../../../../utils/benchmark';

const exec = promisify(execCb);

// `docker stats --format '{{json .}}'` emits PascalCase keys.
/* eslint-disable @typescript-eslint/naming-convention */
interface DockerStatsRow {
	Container: string;
	Name: string;
	CPUPerc: string;
	MemUsage: string;
	NetIO: string;
	BlockIO: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

interface ContainerSample {
	timestampMs: number;
	cpuPct: number;
	memBytes: number;
	blkRead: number;
	blkWrite: number;
	netRx: number;
	netTx: number;
}

const PROJECT_NAME_PREFIX = process.env.PLAYWRIGHT_PROJECT_NAME_PREFIX ?? 'n8n-stack-';

function parseBytes(input: string): number {
	const match = input.trim().match(/^([\d.]+)\s*([kMG]i?B)?$/);
	if (!match) return 0;
	const value = parseFloat(match[1]);
	const unit = match[2] ?? 'B';
	const multipliers: Record<string, number> = {
		B: 1,
		kB: 1000,
		MB: 1000 ** 2,
		GB: 1000 ** 3,
		KiB: 1024,
		MiB: 1024 ** 2,
		GiB: 1024 ** 3,
	};
	return value * (multipliers[unit] ?? 1);
}

function parseDualBytes(input: string): [number, number] {
	const [a, b] = input.split('/').map((s) => parseBytes(s.trim()));
	return [a ?? 0, b ?? 0];
}

function extractServiceName(containerName: string): string {
	if (containerName.startsWith('/')) containerName = containerName.slice(1);
	const idx = containerName.indexOf(PROJECT_NAME_PREFIX);
	if (idx === -1) {
		const dashIdx = containerName.lastIndexOf('-');
		return dashIdx >= 0 ? containerName.slice(dashIdx + 1) : containerName;
	}
	const stripped = containerName.slice(idx + PROJECT_NAME_PREFIX.length);
	const match = stripped.match(/^[a-z0-9]+-(.+)$/);
	return match ? match[1] : stripped;
}

async function sampleOnce(): Promise<Map<string, ContainerSample>> {
	const result = new Map<string, ContainerSample>();
	try {
		// Two-step rather than a piped one-liner with `xargs -r`: BSD/macOS
		// xargs lacks `-r`, and BSD xargs would invoke `docker stats` with no
		// args on an empty pipe, hanging until timeout. Handling the empty
		// case in JS is portable across Linux and Darwin.
		const { stdout: names } = await exec(
			"docker ps --filter 'label=com.docker.compose.project' --format '{{.Names}}'",
			{ timeout: 4000 },
		);
		const containerNames = names
			.trim()
			.split('\n')
			.filter((n) => n.length > 0);
		if (containerNames.length === 0) return result;

		const { stdout } = await exec(
			`docker stats --no-stream --format '{{json .}}' ${containerNames.map((n) => `'${n}'`).join(' ')}`,
			{ timeout: 8000 },
		);
		const now = Date.now();
		for (const line of stdout.trim().split('\n')) {
			if (!line) continue;
			const row = JSON.parse(line) as DockerStatsRow;
			const [memUsed] = parseDualBytes(row.MemUsage);
			const [blkRead, blkWrite] = parseDualBytes(row.BlockIO);
			const [netRx, netTx] = parseDualBytes(row.NetIO);
			result.set(row.Name, {
				timestampMs: now,
				cpuPct: parseFloat(row.CPUPerc.replace('%', '')) || 0,
				memBytes: memUsed,
				blkRead,
				blkWrite,
				netRx,
				netTx,
			});
		}
	} catch {
		// Skip the sample on transient docker failures.
	}
	return result;
}

export class DockerStatsSampler {
	private readonly samples = new Map<string, ContainerSample[]>();

	private timer?: NodeJS.Timeout;

	private isStopped = false;

	private inFlightSample?: Promise<void>;

	constructor(private readonly intervalMs = 3000) {}

	start(): void {
		if (this.timer || this.isStopped) return;
		void this.tick();
		this.timer = setInterval(() => {
			void this.tick();
		}, this.intervalMs);
		this.timer.unref?.();
	}

	private async tick(): Promise<void> {
		if (this.isStopped) return;
		// Skip overlapping execs on a saturated host.
		if (this.inFlightSample) return;
		const promise = (async () => {
			const snapshot = await sampleOnce();
			for (const [name, sample] of snapshot) {
				const arr = this.samples.get(name) ?? [];
				arr.push(sample);
				this.samples.set(name, arr);
			}
		})();
		this.inFlightSample = promise.finally(() => {
			this.inFlightSample = undefined;
		});
		await promise;
	}

	async stop(): Promise<ContainerStat[]> {
		this.isStopped = true;
		if (this.timer) clearInterval(this.timer);
		this.timer = undefined;
		if (this.inFlightSample) {
			try {
				await this.inFlightSample;
			} catch {
				/* ignore */
			}
		}

		const byService = new Map<
			string,
			{
				cpuPctSum: number;
				cpuPctPeak: number;
				cpuPctSamples: number;
				memBytesSum: number;
				memBytesPeak: number;
				memBytesSamples: number;
				blkReadDelta: number;
				blkWriteDelta: number;
				netRxDelta: number;
				netTxDelta: number;
				elapsedSec: number;
			}
		>();

		for (const [containerName, samples] of this.samples) {
			if (samples.length === 0) continue;
			const service = extractServiceName(containerName);
			const entry = byService.get(service) ?? {
				cpuPctSum: 0,
				cpuPctPeak: 0,
				cpuPctSamples: 0,
				memBytesSum: 0,
				memBytesPeak: 0,
				memBytesSamples: 0,
				blkReadDelta: 0,
				blkWriteDelta: 0,
				netRxDelta: 0,
				netTxDelta: 0,
				elapsedSec: 0,
			};

			for (const s of samples) {
				entry.cpuPctSum += s.cpuPct;
				entry.cpuPctSamples += 1;
				if (s.cpuPct > entry.cpuPctPeak) entry.cpuPctPeak = s.cpuPct;
				entry.memBytesSum += s.memBytes;
				entry.memBytesSamples += 1;
				if (s.memBytes > entry.memBytesPeak) entry.memBytesPeak = s.memBytes;
			}

			// IO/Net are cumulative-since-container-start. Compute per-second
			// rates from first-vs-last delta inside the measurement window.
			const first = samples[0];
			const last = samples[samples.length - 1];
			const elapsedSec = Math.max(0.001, (last.timestampMs - first.timestampMs) / 1000);
			entry.blkReadDelta += Math.max(0, last.blkRead - first.blkRead);
			entry.blkWriteDelta += Math.max(0, last.blkWrite - first.blkWrite);
			entry.netRxDelta += Math.max(0, last.netRx - first.netRx);
			entry.netTxDelta += Math.max(0, last.netTx - first.netTx);
			if (elapsedSec > entry.elapsedSec) entry.elapsedSec = elapsedSec;

			byService.set(service, entry);
		}

		const results: ContainerStat[] = [];
		for (const [name, entry] of byService) {
			const elapsed = Math.max(0.001, entry.elapsedSec);
			results.push({
				name,
				cpuPct: entry.cpuPctSamples > 0 ? entry.cpuPctSum / entry.cpuPctSamples : 0,
				cpuPctPeak: entry.cpuPctPeak,
				memBytes: entry.memBytesSamples > 0 ? entry.memBytesSum / entry.memBytesSamples : 0,
				memBytesPeak: entry.memBytesPeak,
				fsReadsBytesRate: entry.blkReadDelta / elapsed,
				fsWritesBytesRate: entry.blkWriteDelta / elapsed,
				netRxBytesRate: entry.netRxDelta / elapsed,
				netTxBytesRate: entry.netTxDelta / elapsed,
			});
		}
		return results.sort((a, b) => (b.cpuPctPeak ?? 0) - (a.cpuPctPeak ?? 0));
	}

	sampleCount(): number {
		let total = 0;
		for (const arr of this.samples.values()) total += arr.length;
		return total;
	}
}
