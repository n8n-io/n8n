import type { IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { dateTimeToEpochPreSendAction } from '../GenericFunctions';

describe('dateTimeToEpochPreSendAction', () => {
	let mockThis: Partial<IExecuteSingleFunctions>;

	beforeEach(() => {
		mockThis = {};
	});

	it('should convert startDate and endDate to epoch time', async () => {
		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			qs: {
				startDate: '2024-12-25T00:00:00Z',
				endDate: '2024-12-26T00:00:00Z',
			},
		};

		const result = await dateTimeToEpochPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.qs).toEqual({
			startDate: new Date('2024-12-25T00:00:00Z').getTime(),
			endDate: new Date('2024-12-26T00:00:00Z').getTime(),
		});
	});

	it('should convert only startDate if endDate is not provided', async () => {
		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			qs: {
				startDate: '2024-12-25T00:00:00Z',
			},
		};

		const result = await dateTimeToEpochPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.qs).toEqual({
			startDate: new Date('2024-12-25T00:00:00Z').getTime(),
		});
	});

	it('should convert only endDate if startDate is not provided', async () => {
		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			qs: {
				endDate: '2024-12-26T00:00:00Z',
			},
		};

		const result = await dateTimeToEpochPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.qs).toEqual({
			endDate: new Date('2024-12-26T00:00:00Z').getTime(),
		});
	});

	it('should not modify requestOptions if neither startDate nor endDate are provided', async () => {
		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			qs: {},
		};

		const result = await dateTimeToEpochPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result).toEqual(requestOptions);
	});

	it('should not modify requestOptions if qs is undefined', async () => {
		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			qs: undefined,
		};

		const result = await dateTimeToEpochPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result).toEqual(requestOptions);
	});
});
