/**
 * Retry coordinator client.
 *
 * On CI retry (`GITHUB_RUN_ATTEMPT > 1`), asks an external webhook which specs
 * from the shard's manifest failed in the previous attempt and returns the
 * intersection. The webhook owns the Currents API key and the fallback logic
 * for "no previous run", "no failures", and "no intersection" — clients can
 * trust the returned `intersection` field in every successful response.
 *
 * Any network/parse/non-2xx failure here MUST fall back to running the full
 * shard so a coordinator outage never breaks CI.
 */

export interface RetryFilterRequest {
	url: string;
	runId: string;
	previousAttempt: string;
	candidates: string[];
	timeoutMs?: number;
}

export interface RetryFilterResponse {
	ciBuildId?: string;
	runId?: string;
	previousAttempt?: string;
	totalCandidates?: number;
	totalFailedSpecs?: number;
	intersection: string[];
	fallback?: boolean;
	fallbackReason?: string | null;
}

const DEFAULT_TIMEOUT_MS = 2_000;

export async function filterToFailedSpecs(
	request: RetryFilterRequest,
): Promise<RetryFilterResponse> {
	const { url, runId, previousAttempt, candidates, timeoutMs = DEFAULT_TIMEOUT_MS } = request;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ runId, previousAttempt, candidates }),
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(`Retry coordinator responded with ${response.status} ${response.statusText}`);
		}

		const body = (await response.json()) as Partial<RetryFilterResponse>;

		if (!Array.isArray(body.intersection)) {
			throw new Error('Retry coordinator response missing "intersection" array');
		}

		return body as RetryFilterResponse;
	} finally {
		clearTimeout(timer);
	}
}
