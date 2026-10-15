import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { open, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { RequestCounts } from './request-counts.mjs';

export const DEFAULT_REQUEST_LIMIT = 500;
export const MAX_REQUEST_LIMIT = 5000;

export function requestLimit(value = DEFAULT_REQUEST_LIMIT) {
	if (!Number.isInteger(value) || value < 1 || value > MAX_REQUEST_LIMIT)
		throw new Error(`Keep from 1 to ${MAX_REQUEST_LIMIT} API calls`);
	return value;
}

export class RequestHistory {
	#recent = new Map();
	#revision = 0;
	#written = -1;
	#queue = Promise.resolve();

	constructor(filename, limit = DEFAULT_REQUEST_LIMIT) {
		this.filename = filename;
		this.counts = new RequestCounts();
		this.limit = requestLimit(limit);
	}

	setLimit(limit) {
		this.limit = requestLimit(limit);
		this.#trim();
	}

	#trim() {
		while (this.#recent.size > this.limit) {
			this.#recent.delete(this.#recent.keys().next().value);
			this.#revision++;
		}
	}

	add(event) {
		this.counts.add(event);
		const key = `${event.segmentId}:${event.id}`;
		if (event.event === 'start') this.#recent.set(key, { start: event });
		else {
			const entry = this.#recent.get(key);
			// An old in-flight call must not return after its start was evicted.
			if (!entry) return;
			entry.finish = event;
		}
		this.#revision++;
		this.#trim();
	}

	async flush() {
		const write = async () => {
			if (this.#written === this.#revision) return;
			const revision = this.#revision;
			const events = [...this.#recent.values()].flatMap(({ start, finish }) =>
				finish ? [start, finish] : [start],
			);
			const temporary = `${this.filename}.${randomUUID()}.tmp`;
			let file;
			try {
				file = await open(temporary, 'wx', 0o600);
				for (const event of events) await file.writeFile(`${JSON.stringify(event)}\n`);
				await file.close();
				file = undefined;
				await rename(temporary, this.filename);
				this.#written = revision;
			} finally {
				await file?.close();
				await rm(temporary, { force: true });
			}
		};
		const pending = this.#queue.then(write);
		this.#queue = pending.catch(() => {});
		await pending;
	}
}

export async function requestReport(filename, enabled, limit = DEFAULT_REQUEST_LIMIT, counts) {
	const savedCounts = new RequestCounts();
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
			recent.set(key, request);
			if (recent.size > limit) recent.delete(recent.keys().next().value);
			if (request.event === 'start') started++;
			else {
				if (!counts) savedCounts.add(request);
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
	const totals = counts ?? savedCounts;
	return {
		enabled,
		counts: totals.summary(counts ? 'session' : 'saved-history'),
		started,
		completed,
		aborted,
		unfinished: Math.max(0, started - completed),
		invalidEvents,
		historyLimit: limit,
		recent: [...recent.values()].map((request) => ({ ...request, ...totals.forRequest(request) })),
		endpoints: [...endpoints.values()]
			.sort((a, b) => b.totalDurationMs - a.totalDurationMs)
			.slice(0, 50),
	};
}
