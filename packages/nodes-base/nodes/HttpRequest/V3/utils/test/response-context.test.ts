import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { Readable } from 'stream';

import { getResponseForContext } from '../response-context';

const REQUEST_HEADER = 'X-Custom-Header: custom-value';

// A response stream references its socket, and the socket references the raw request headers.
function createStreamWithRequestHeaders() {
	const socket = new Socket();
	Object.assign(socket, {
		_httpMessage: { _header: `GET / HTTP/1.1\r\n${REQUEST_HEADER}\r\n` },
	});
	return new IncomingMessage(socket);
}

describe('getResponseForContext', () => {
	it('should replace a response stream with a placeholder', () => {
		const result = getResponseForContext({
			statusCode: 200,
			statusMessage: 'OK',
			headers: { 'content-type': 'image/png' },
			body: createStreamWithRequestHeaders(),
		});

		expect(result).toEqual({
			statusCode: 200,
			statusMessage: 'OK',
			headers: { 'content-type': 'image/png' },
			body: expect.stringContaining('Original was a stream'),
		});
		expect(JSON.stringify(result)).not.toContain(REQUEST_HEADER);
	});

	it('should replace any readable stream body', () => {
		const result = getResponseForContext({ body: Readable.from(['data']) });

		expect(typeof result.body).toBe('string');
	});

	it('should replace a stream that is not an instance of the Node stream classes', () => {
		const foreignStream = {
			pipe: () => {},
			socket: { _httpMessage: { _header: `GET / HTTP/1.1\r\n${REQUEST_HEADER}\r\n` } },
		};

		const result = getResponseForContext({ body: foreignStream });

		expect(typeof result.body).toBe('string');
		expect(JSON.stringify(result)).not.toContain(REQUEST_HEADER);
	});

	it('should keep a body that only has a pipe property which is not a function', () => {
		const body = { pipe: 'value' };

		expect(getResponseForContext({ body }).body).toBe(body);
	});

	it.each([
		['object', { id: 1 }],
		['text', 'hello'],
		['buffer', Buffer.from('hello')],
		['undefined', undefined],
	])('should keep a %s body', (_name, body) => {
		expect(getResponseForContext({ body }).body).toBe(body);
	});

	it('should not keep properties outside the allowlist', () => {
		const result = getResponseForContext({
			statusCode: 302,
			headers: {},
			body: '',
			request: createStreamWithRequestHeaders(),
			socket: createStreamWithRequestHeaders(),
		});

		expect(Object.keys(result).sort()).toEqual(['body', 'headers', 'statusCode', 'statusMessage']);
		expect(JSON.stringify(result)).not.toContain(REQUEST_HEADER);
	});
});
