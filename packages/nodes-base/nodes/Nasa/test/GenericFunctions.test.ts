import type { IExecuteFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { nasaApiRequest } from '../GenericFunctions';

describe('NASA GenericFunctions', () => {
	it('routes DONKI requests to the current CCMC API', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({ api_key: 'test-key' });
		executeFunctions.helpers.request.mockResolvedValue([]);

		await nasaApiRequest.call(executeFunctions, 'GET', '/DONKI/FLR', {
			startDate: '2026-10-01',
			endDate: '2026-10-02',
		});

		expect(executeFunctions.helpers.request).toHaveBeenCalledWith({
			method: 'GET',
			qs: {
				api_key: 'test-key',
				startDate: '2026-10-01',
				endDate: '2026-10-02',
			},
			uri: 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR',
			json: true,
		});
	});

	it('keeps non-DONKI requests on the NASA API', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({ api_key: 'test-key' });
		executeFunctions.helpers.request.mockResolvedValue({});

		await nasaApiRequest.call(executeFunctions, 'GET', '/planetary/apod', {});

		expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: 'https://api.nasa.gov/planetary/apod',
				qs: { api_key: 'test-key' },
			}),
		);
	});
});
