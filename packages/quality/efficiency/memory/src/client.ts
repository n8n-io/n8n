import type { ProcessInternals } from '@n8n/api-types';
import { createHash } from 'node:crypto';
import { open, rename, rm } from 'node:fs/promises';
import { basename } from 'node:path';
import { z } from 'zod';

import { readingSchema, snapshotResponseSchema } from './schema.js';

export function normalizeUrl(value: string): string {
	const url = new URL(value);
	if (
		!['http:', 'https:'].includes(url.protocol) ||
		url.username ||
		url.password ||
		url.search ||
		url.hash
	) {
		throw new Error('Use an HTTP(S) instance URL without credentials, a query, or a fragment.');
	}
	return url.toString().replace(/\/$/, '');
}

export class DiagnosticsClient {
	constructor(
		readonly url: string,
		private readonly timeoutMs: number,
		private readonly signal: AbortSignal,
	) {}

	private async request(
		path: string,
		method = 'GET',
		timeoutMs = this.timeoutMs,
	): Promise<Response> {
		const signal = AbortSignal.any([this.signal, AbortSignal.timeout(timeoutMs)]);
		// eslint-disable-next-line n8n-local-rules/no-uncentralized-http -- Standalone developer diagnostics need abortable snapshot streams without loading n8n's DI container.
		const response = await fetch(`${this.url}/rest/e2e/${path}`, {
			method,
			signal,
			redirect: 'error',
		});
		if (!response.ok) {
			await response.body?.cancel();
			throw new Error(
				`Diagnostics ${path} returned HTTP ${response.status}. Start n8n with E2E_TESTS=true and the process diagnostics routes.`,
			);
		}
		return response;
	}

	async read(): Promise<ProcessInternals> {
		const response = await this.request('internals');
		const result = z.object({ data: readingSchema }).safeParse(await response.json());
		if (!result.success)
			throw new Error(
				'The process diagnostics response is incompatible. Rebuild and restart the backend diagnostics code.',
			);
		return result.data.data;
	}

	async gc(): Promise<void> {
		const response = await this.request('gc', 'POST');
		const result = z
			.object({ data: z.object({ success: z.boolean() }) })
			.parse(await response.json());
		if (!result.data.success)
			throw new Error('GC is unavailable. Start the n8n Node process with --expose-gc.');
	}

	async snapshot(destination: string): Promise<{ sizeBytes: number; sha256: string }> {
		const response = await this.request('heap-snapshot', 'POST', Math.max(this.timeoutMs, 120_000));
		const result = z.object({ data: snapshotResponseSchema }).parse(await response.json()).data;
		if (!result.success) throw new Error(`Snapshot capture failed: ${result.message}`);
		const filename = basename(result.filePath);
		if (!filename.endsWith('.heapsnapshot'))
			throw new Error('The diagnostics server returned an invalid snapshot filename.');
		const download = await this.request(
			`heap-snapshot/${encodeURIComponent(filename)}`,
			'GET',
			Math.max(this.timeoutMs, 120_000),
		);
		if (!download.body) throw new Error('The snapshot response has no body.');
		const partial = `${destination}.partial`;
		const file = await open(partial, 'wx');
		const reader = download.body.getReader();
		let size = 0;
		const hash = createHash('sha256');
		try {
			while (true) {
				const chunk = await reader.read();
				if (chunk.done) break;
				await file.writeFile(chunk.value);
				size += chunk.value.byteLength;
				hash.update(chunk.value);
			}
			if (size !== result.sizeBytes) throw new Error('The snapshot download is incomplete.');
			await file.close();
			await rename(partial, destination);
			return { sizeBytes: size, sha256: hash.digest('hex') };
		} catch (error) {
			await reader.cancel().catch(() => {});
			await file.close().catch(() => {});
			await rm(partial, { force: true });
			throw error;
		} finally {
			reader.releaseLock();
		}
	}
}
