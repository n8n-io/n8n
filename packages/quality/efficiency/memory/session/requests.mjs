import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export async function requestReport(filename, enabled, limit = 1000) {
	const recent = new Map();
	const endpoints = new Map();
	let started = 0;
	let completed = 0;
	let aborted = 0;
	let invalidEvents = 0;
	if (filename) {
		const lines = createInterface({ input: createReadStream(filename), crlfDelay: Infinity });
		for await (const line of lines) {
			if (!line) continue;
			let request;
			try {
				request = JSON.parse(line);
			} catch {
				invalidEvents++;
				continue;
			}
			if (
				request === null ||
				typeof request !== 'object' ||
				!['start', 'finish'].includes(request.event) ||
				!Number.isFinite(request.elapsedMs) ||
				typeof request.route !== 'string' ||
				(request.event === 'finish' &&
					(!Number.isFinite(request.durationMs) ||
						request.durationMs < 0 ||
						!Number.isInteger(request.statusCode)))
			) {
				invalidEvents++;
				continue;
			}
			const key = `${request.segmentId}:${request.id}`;
			recent.delete(key);
			recent.set(key, request);
			if (recent.size > limit) recent.delete(recent.keys().next().value);
			if (request.event === 'start') started++;
			else {
				completed++;
				if (request.aborted) aborted++;
				const route = JSON.stringify([request.api, request.method, request.route]);
				if (!endpoints.has(route) && endpoints.size >= 1000) continue;
				const entry = endpoints.get(route) ?? {
					api: request.api,
					method: request.method,
					route: request.route,
					count: 0,
					errors: 0,
					totalDurationMs: 0,
					peakDurationMs: 0,
				};
				entry.count++;
				if (request.statusCode >= 400 || request.aborted) entry.errors++;
				entry.totalDurationMs += request.durationMs;
				entry.peakDurationMs = Math.max(entry.peakDurationMs, request.durationMs);
				endpoints.set(route, entry);
			}
		}
	}
	return {
		enabled,
		started,
		completed,
		aborted,
		unfinished: Math.max(0, started - completed),
		invalidEvents,
		historyLimit: limit,
		recent: [...recent.values()],
		endpoints: [...endpoints.values()]
			.sort((a, b) => b.totalDurationMs - a.totalDurationMs)
			.slice(0, 50),
	};
}
