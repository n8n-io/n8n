import type { IBinaryData, IRequestOptions } from 'n8n-workflow';

import { setFilename } from '../../V3/utils/binaryData';

describe('setFilename', () => {
	it('returns filename from URI if fileName is missing and URI ends with fileExtension', () => {
		const preparedBinaryData = { fileExtension: 'png' } as IBinaryData;
		const requestOptions = { uri: 'https://example.com/image.png' } as IRequestOptions;
		expect(setFilename(preparedBinaryData, requestOptions, undefined)).toBe('image.png');
	});

	it('returns the pathname filename when the URI includes search parameters', () => {
		const preparedBinaryData = { fileExtension: 'png' } as IBinaryData;
		const requestOptions = {
			uri: 'https://example.com/image.png?size=large.png',
		} as IRequestOptions;

		expect(setFilename(preparedBinaryData, requestOptions, undefined)).toBe('image.png');
	});

	it('uses the default filename when the pathname has no file extension', () => {
		const preparedBinaryData = { fileExtension: 'png' } as IBinaryData;
		const requestOptions = {
			uri: 'https://example.com/download?format=preview.png',
		} as IRequestOptions;

		expect(setFilename(preparedBinaryData, requestOptions, undefined)).toBe('data.png');
	});

	it('uses the default filename when the URI cannot be parsed', () => {
		const preparedBinaryData = { fileExtension: 'png' } as IBinaryData;
		const requestOptions = {
			uri: 'http://[invalid/download?format=preview.png',
		} as IRequestOptions;

		expect(setFilename(preparedBinaryData, requestOptions, undefined)).toBe('data.png');
	});

	it('returns constructed filename if fileName is missing and URI does not end with fileExtension', () => {
		const preparedBinaryData = { fileExtension: 'jpg' } as IBinaryData;
		const requestOptions = { uri: 'https://example.com/image.png' } as IRequestOptions;
		expect(setFilename(preparedBinaryData, requestOptions, 'response')).toBe('response.jpg');
	});

	it('returns constructed filename with default "data" if responseFileName is undefined', () => {
		const preparedBinaryData = { fileExtension: 'txt' } as IBinaryData;
		const requestOptions = { uri: 'https://example.com/file' } as IRequestOptions;
		expect(setFilename(preparedBinaryData, requestOptions, undefined)).toBe('data.txt');
	});

	it('returns fileName if it exists', () => {
		const preparedBinaryData = { fileName: 'myfile.pdf', fileExtension: 'pdf' } as IBinaryData;
		const requestOptions = { uri: 'https://example.com/file.pdf' } as IRequestOptions;
		expect(setFilename(preparedBinaryData, requestOptions, 'response')).toBe('myfile.pdf');
	});
});
