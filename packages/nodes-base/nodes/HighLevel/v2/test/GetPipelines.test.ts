import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getPipelines } from '../GenericFunctions';

describe('getPipelines', () => {
	const mockHighLevelApiRequest = jest.fn();
	const mockGetCredentials = jest.fn();
	const mockContext = {
		getCredentials: mockGetCredentials,
		helpers: {
			httpRequestWithAuthentication: mockHighLevelApiRequest,
		},
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		mockHighLevelApiRequest.mockClear();
		mockGetCredentials.mockClear();
	});

	it('should return a list of pipelines', async () => {
		const mockPipelines = [
			{ id: '1', name: 'Pipeline A' },
			{ id: '2', name: 'Pipeline B' },
		];

		mockHighLevelApiRequest.mockResolvedValue({ pipelines: mockPipelines });
		mockGetCredentials.mockResolvedValue({ oauthTokenData: { locationId: '123' } });

		const response = await getPipelines.call(mockContext);

		expect(response).toEqual([
			{ name: 'Pipeline A', value: '1' },
			{ name: 'Pipeline B', value: '2' },
		]);
	});

	it('should handle empty pipelines list', async () => {
		mockHighLevelApiRequest.mockResolvedValue({ pipelines: [] });
		mockGetCredentials.mockResolvedValue({ oauthTokenData: { locationId: '123' } });

		const response = await getPipelines.call(mockContext);

		expect(response).toEqual([]);
	});
});
