import { createHash } from 'node:crypto';

export const ENDPOINT_COUNT_LIMIT = 1000;
export const PAYLOAD_COUNT_LIMIT = 10_000;

const endpointKey = ({ api, method, route }) => JSON.stringify([api, method, route]);
const payloadKey = (endpoint, hash) => JSON.stringify([endpoint, hash]);
const positiveCount = (value) => Number.isSafeInteger(value) && value > 0;

function payloadHash(request) {
	const body = request.request?.body;
	if (body?.omitted || typeof body?.text !== 'string') return undefined;
	let text = `text:${body.text}`;
	try {
		// Match captured JSON values without depending on object key order.
		text = `json:${JSON.stringify(JSON.parse(body.text), (_key, value) =>
			value && typeof value === 'object' && !Array.isArray(value)
				? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
				: value,
		)}`;
	} catch {}
	return createHash('sha256').update(text).digest('hex');
}

export class RequestCounts {
	#endpoints = new Map();
	#payloads = new Map();
	#completed = 0;
	#untrackedEndpointCalls = 0;
	#untrackedPayloadCalls = 0;

	get completed() {
		return this.#completed;
	}

	add(request) {
		if (request.event !== 'finish') return;
		this.#completed++;
		const key = endpointKey(request);
		let endpoint = this.#endpoints.get(key);
		if (!endpoint) {
			if (this.#endpoints.size >= ENDPOINT_COUNT_LIMIT) {
				this.#untrackedEndpointCalls++;
				return;
			}
			endpoint = { api: request.api, method: request.method, route: request.route, count: 0 };
			this.#endpoints.set(key, endpoint);
		}
		endpoint.count++;
		const hash = payloadHash(request);
		if (!hash) return;
		const identity = payloadKey(key, hash);
		let payload = this.#payloads.get(identity);
		if (!payload) {
			// Keep existing totals exact when new payload identities reach the limit.
			if (this.#payloads.size >= PAYLOAD_COUNT_LIMIT) {
				this.#untrackedPayloadCalls++;
				return;
			}
			payload = { endpoint: key, hash, count: 0 };
			this.#payloads.set(identity, payload);
		}
		payload.count++;
	}

	forRequest(request) {
		const key = endpointKey(request);
		const hash = payloadHash(request);
		return {
			endpointCount: this.#endpoints.get(key)?.count ?? null,
			payloadCount: hash ? (this.#payloads.get(payloadKey(key, hash))?.count ?? null) : null,
		};
	}

	summary(scope) {
		return {
			scope,
			completed: this.#completed,
			untrackedEndpointCalls: this.#untrackedEndpointCalls,
			untrackedPayloadCalls: this.#untrackedPayloadCalls,
			endpoints: [...this.#endpoints.values()],
		};
	}

	snapshot() {
		return {
			schemaVersion: 1,
			...this.summary('session'),
			payloads: [...this.#payloads.values()],
		};
	}

	static fromSnapshot(value) {
		if (
			value?.schemaVersion !== 1 ||
			!Array.isArray(value.endpoints) ||
			value.endpoints.length > ENDPOINT_COUNT_LIMIT ||
			!Array.isArray(value.payloads) ||
			value.payloads.length > PAYLOAD_COUNT_LIMIT ||
			![value.completed, value.untrackedEndpointCalls, value.untrackedPayloadCalls].every(
				(count) => Number.isSafeInteger(count) && count >= 0,
			)
		)
			throw new Error('Invalid request counts');
		const counts = new RequestCounts();
		counts.#completed = value.completed;
		counts.#untrackedEndpointCalls = value.untrackedEndpointCalls;
		counts.#untrackedPayloadCalls = value.untrackedPayloadCalls;
		for (const endpoint of value.endpoints) {
			if (
				!endpoint ||
				!['internal', 'public'].includes(endpoint.api) ||
				typeof endpoint.method !== 'string' ||
				typeof endpoint.route !== 'string' ||
				!positiveCount(endpoint.count)
			)
				throw new Error('Invalid endpoint count');
			counts.#endpoints.set(endpointKey(endpoint), endpoint);
		}
		for (const payload of value.payloads) {
			if (
				!payload ||
				!counts.#endpoints.has(payload.endpoint) ||
				typeof payload.hash !== 'string' ||
				!/^[a-f0-9]{64}$/.test(payload.hash) ||
				!positiveCount(payload.count)
			)
				throw new Error('Invalid payload count');
			counts.#payloads.set(payloadKey(payload.endpoint, payload.hash), payload);
		}
		return counts;
	}
}
