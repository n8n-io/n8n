import type { IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { splitTagsPreSendAction } from '../GenericFunctions';

describe('splitTagsPreSendAction', () => {
	let mockThis: Partial<IExecuteSingleFunctions>;

	beforeEach(() => {
		mockThis = {};
	});

	it('should return requestOptions unchanged if tags are already an array', async () => {
		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: {
				tags: ['tag1', 'tag2', 'tag3'],
			},
		};

		const result = await splitTagsPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result).toEqual(requestOptions);
	});

	it('should split a comma-separated string of tags into an array', async () => {
		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: {
				tags: 'tag1, tag2, tag3',
			},
		};

		const result = await splitTagsPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.body).toEqual({
			tags: ['tag1', 'tag2', 'tag3'],
		});
	});

	it('should trim whitespace around tags when splitting a string', async () => {
		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: {
				tags: 'tag1 ,   tag2 , tag3  ',
			},
		};

		const result = await splitTagsPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.body).toEqual({
			tags: ['tag1', 'tag2', 'tag3'],
		});
	});

	it('should return requestOptions unchanged if tags are not provided', async () => {
		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: {},
		};

		const result = await splitTagsPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result).toEqual(requestOptions);
	});

	it('should return requestOptions unchanged if body is undefined', async () => {
		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: undefined,
		};

		const result = await splitTagsPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result).toEqual(requestOptions);
	});
});
