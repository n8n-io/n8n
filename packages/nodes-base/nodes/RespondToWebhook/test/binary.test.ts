import { sandboxHtmlResponse } from 'n8n-core';
import type { IDataObject } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';

import { getBinaryResponse } from '../utils/binary';

describe('getBinaryResponse', () => {
	it('returns sanitized HTML when binaryData.id is present and mimeType is text/html', () => {
		const binaryData = {
			id: '123',
			data: '<h1>Hello</h1>',
			mimeType: 'text/html',
		};
		const headers: IDataObject = {};

		const result = getBinaryResponse(binaryData, headers);

		expect(result).toBe(sandboxHtmlResponse(binaryData.data));
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
			sandboxHtmlResponse(Buffer.from(binaryData.data, BINARY_ENCODING).toString()),
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
