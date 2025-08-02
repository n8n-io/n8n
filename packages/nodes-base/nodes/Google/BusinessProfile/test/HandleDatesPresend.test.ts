import type { IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { handleDatesPresend } from '../GenericFunctions';

describe('GenericFunctions - handleDatesPresend', () => {
	const mockGetNode = jest.fn();
	const mockGetNodeParameter = jest.fn();

	const mockContext = {
		getNode: mockGetNode,
		getNodeParameter: mockGetNodeParameter,
	} as unknown as IExecuteSingleFunctions;

	beforeEach(() => {
		mockGetNode.mockClear();
		mockGetNodeParameter.mockClear();
	});

	it('should return options unchanged if no date-time parameters are provided', async () => {
		mockGetNode.mockReturnValue({
			parameters: {},
		});
		mockGetNodeParameter.mockReturnValue({});

		const opts: Partial<IHttpRequestOptions> = {
			body: {},
		};

		const result = await handleDatesPresend.call(mockContext, opts as IHttpRequestOptions);

		expect(result).toEqual(opts);
	});

	it('should merge startDateTime parameter into event schedule', async () => {
		mockGetNode.mockReturnValue({
			parameters: {
				startDateTime: '2023-09-15T10:00:00.000Z',
			},
		});
		mockGetNodeParameter.mockReturnValue({});

		const opts: Partial<IHttpRequestOptions> = {
			body: {},
		};

		const result = await handleDatesPresend.call(mockContext, opts as IHttpRequestOptions);

		expect(result.body).toEqual({
			event: {
				schedule: {
					startDate: { year: 2023, month: 9, day: 15 },
					startTime: { hours: 10, minutes: 0, seconds: 0, nanos: 0 },
				},
			},
		});
	});

	it('should merge startDate and endDateTime parameters into event schedule', async () => {
		mockGetNode.mockReturnValue({
			parameters: {
				startDate: '2023-09-15',
				endDateTime: '2023-09-16T12:30:00.000Z',
			},
		});
		mockGetNodeParameter.mockReturnValue({});

		const opts: Partial<IHttpRequestOptions> = {
			body: {},
		};

		const result = await handleDatesPresend.call(mockContext, opts as IHttpRequestOptions);

		expect(result.body).toEqual({
			event: {
				schedule: {
					startDate: { year: 2023, month: 9, day: 15 },
					endDate: { year: 2023, month: 9, day: 16 },
					endTime: { hours: 12, minutes: 30, seconds: 0, nanos: 0 },
				},
			},
		});
	});

	it('should merge additional options into event schedule', async () => {
		mockGetNode.mockReturnValue({
			parameters: {
				startDate: '2023-09-15',
			},
		});
		mockGetNodeParameter.mockReturnValue({
			additionalOption: 'someValue',
		});

		const opts: Partial<IHttpRequestOptions> = {
			body: {},
		};

		const result = await handleDatesPresend.call(mockContext, opts as IHttpRequestOptions);

		expect(result.body).toEqual({
			event: {
				schedule: {
					startDate: { year: 2023, month: 9, day: 15 },
				},
			},
		});
	});

	it('should modify the body with event schedule containing only date', async () => {
		mockGetNode.mockReturnValue({
			parameters: {
				startDate: '2023-09-15',
			},
		});
		mockGetNodeParameter.mockReturnValue({});

		const opts: Partial<IHttpRequestOptions> = {
			body: { event: {} },
		};

		const result = await handleDatesPresend.call(mockContext, opts as IHttpRequestOptions);

		expect(result.body).toEqual({
			event: {
				schedule: {
					startDate: { year: 2023, month: 9, day: 15 },
				},
			},
		});
	});
});
