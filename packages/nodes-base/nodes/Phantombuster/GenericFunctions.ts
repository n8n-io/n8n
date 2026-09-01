import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { StringDecoder } from 'node:string_decoder';
import type { Readable } from 'stream';

export async function phantombusterApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,

	body: any = {},
	qs: IDataObject = {},
	_option = {},
): Promise<any> {
	const options: IRequestOptions = {
		headers: {},
		method,
		body,
		qs,
		uri: `https://api.phantombuster.com/api/v2${path}`,
		json: true,
	};
	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		return await this.helpers.requestWithAuthentication.call(this, 'phantombusterApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function validateJSON(self: IExecuteFunctions, json: string | undefined, name: string) {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		throw new NodeOperationError(self.getNode(), `${name} must provide a valid JSON`);
	}
	return result;
}

/**
 * Phantombuster streams have ndjson format
 * fhe first message of the stream has this format { type: "start", data: unknown}
 * the last message of the stream has this format { type: "summary", data: unknown}
 * if there is an error, the last message has this format { type: "error", data: string }
 * if the stream ends without a summary or an error, we assume there has been a disconnnection
 */
export async function phantombusterStreamingRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	options: {
		method: IHttpRequestMethods;
		path: string;
		body?: IDataObject;
		qs?: IDataObject;
	},
	onMessage?: (message: { type?: string; data?: unknown }) => void | Promise<void>,
): Promise<IDataObject | null> {
	let stream: AsyncIterable<string>;
	try {
		stream = await streamingRequest.call(this, 'phantombusterApi', {
			method: options.method,
			url: `https://api.phantombuster.com/api/v2${options.path}`,
			body: options.body,
			qs: options.qs,
			timeout: 30_000, // socket inactivity — server heartbeats every 10s keep this reset
		});
	} catch (error) {
		// Transport-level failure (auth, routing, 5xx) before any data arrived —
		// terminal, surface immediately rather than asking the caller to retry.
		if (error instanceof NodeApiError) throw error;
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}

	try {
		for await (const line of stream) {
			if (line.length === 0) continue;

			let parsed: unknown;
			try {
				parsed = JSON.parse(line);
			} catch {
				throw new NodeApiError(this.getNode(), {
					message: 'Phantombuster sent a malformed NDJSON line',
					description: line.slice(0, 200),
				});
			}

			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				throw new NodeApiError(this.getNode(), {
					message: 'Phantombuster sent a non-object NDJSON record',
					description: line.slice(0, 200),
				});
			}

			const message = parsed as { type?: string; data?: unknown };

			if (message.type === 'error') {
				const reason =
					typeof message.data === 'string' ? message.data : JSON.stringify(message.data);
				throw new NodeApiError(
					this.getNode(),
					{ message: reason },
					{ message: reason, description: 'Phantombuster agent reported an error' },
				);
			}

			if (message.type === 'summary') {
				return (message.data ?? {}) as IDataObject;
			}

			await onMessage?.(message);
		}
	} catch (error) {
		// A mid-stream transport drop is recoverable: return null so the caller can
		// reconnect
		const code = (error as { code?: string }).code;
		const DISCONNECT_CODES = [
			'ECONNRESET',
			'ECONNABORTED',
			'EPIPE',
			'ETIMEDOUT',
			'ERR_STREAM_PREMATURE_CLOSE',
			'ERR_HTTP2_STREAM_ERROR',
		];
		if (code && DISCONNECT_CODES.includes(code)) return null;

		if (error instanceof NodeApiError) throw error;
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}

	return null;
}

/**
 * Generic streaming function.
 * Yields line by line
 */
async function streamingRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	credentialsType: string,
	options: {
		method: IHttpRequestMethods;
		url: string;
		body?: IHttpRequestOptions['body'];
		qs?: IDataObject;
		timeout?: number;
	},
): Promise<AsyncIterable<string>> {
	const MAX_BUFFER_SIZE = 1_048_576; // 1 Mb

	const node = this.getNode();
	const abortSignal =
		'getExecutionCancelSignal' in this ? this.getExecutionCancelSignal() : undefined;
	const stream = (await this.helpers.httpRequestWithAuthentication.call(this, credentialsType, {
		...options,
		abortSignal,
		encoding: 'stream',
	})) as Readable;

	async function* iterate(): AsyncGenerator<string> {
		// StringDecoder buffers partial multi-byte UTF-8 sequences across chunk
		// boundaries so codepoints split mid-byte aren't mangled into U+FFFD.
		const decoder = new StringDecoder('utf8');
		let buffer = '';
		try {
			for await (const chunk of stream) {
				buffer += Buffer.isBuffer(chunk) ? decoder.write(chunk) : String(chunk);

				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';

				// Guard against an unbounded unterminated line. Checked against the
				// residual (post-split) so a chunk carrying many small complete
				// records doesn't trip it — only the still-open trailing line matters.
				if (buffer.length > MAX_BUFFER_SIZE) {
					throw new NodeApiError(node, {
						message: `Streaming line exceeded ${MAX_BUFFER_SIZE} bytes without a newline terminator`,
					});
				}

				for (const rawLine of lines) {
					yield rawLine.replace(/\r$/, '');
				}
			}

			// Flush any final bytes still held by the decoder and any trailing data
			// that didn't end with a newline.
			buffer += decoder.end();
			const tail = buffer.replace(/\r$/, '');
			if (tail.length > 0) {
				yield tail;
			}
		} finally {
			stream.destroy();
		}
	}

	return iterate();
}
