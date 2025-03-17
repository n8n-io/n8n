import type { IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { validateContainerFields } from '../generalFunctions/dataHandling';

describe('validateContainerFields', () => {
	const mockContext = {
		getNodeParameter: jest.fn(),
		getCredentials: jest.fn(),
	} as unknown as IExecuteSingleFunctions;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should add manual throughput header when manualThroughput is provided', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockImplementation((param) => {
			if (param === 'additionalFields') return { offerThroughput: 500 };
			return '';
		});

		const requestOptions: IHttpRequestOptions = { headers: {}, url: '' };

		const result = await validateContainerFields.call(mockContext, requestOptions);

		expect(result.headers).toHaveProperty('x-ms-offer-throughput', 500);
		expect(result.headers).not.toHaveProperty('x-ms-cosmos-offer-autopilot-setting');
	});

	it('should add autoscale throughput header when autoscaleThroughput is provided', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockImplementation((param) => {
			if (param === 'additionalFields') return { maxThroughput: 1000 };
			return '';
		});

		const requestOptions: IHttpRequestOptions = { headers: {}, url: '' };

		const result = await validateContainerFields.call(mockContext, requestOptions);

		expect(result.headers).toHaveProperty('x-ms-cosmos-offer-autopilot-setting', {
			maxThroughput: 1000,
		});
		expect(result.headers).not.toHaveProperty('x-ms-offer-throughput');
	});

	it('should not add throughput headers if neither manualThroughput nor autoscaleThroughput are provided', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockImplementation((param) => {
			if (param === 'additionalFields') return {};
			return '';
		});

		const requestOptions: IHttpRequestOptions = { headers: {}, url: '' };

		const result = await validateContainerFields.call(mockContext, requestOptions);

		expect(result.headers).not.toHaveProperty('x-ms-offer-throughput');
		expect(result.headers).not.toHaveProperty('x-ms-cosmos-offer-autopilot-setting');
	});
});
