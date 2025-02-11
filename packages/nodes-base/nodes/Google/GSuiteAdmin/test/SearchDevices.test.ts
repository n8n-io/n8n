import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { googleApiRequest } from '../GenericFunctions';
import { searchDevices } from '../SearchFunctions';

jest.mock('../GenericFunctions');

describe('SearchFunctions - searchDevices', () => {
	const mockContext = {} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		(googleApiRequest as jest.Mock).mockClear();
	});

	it('should return a list of ChromeOS devices when googleApiRequest returns devices', async () => {
		(googleApiRequest as jest.Mock).mockResolvedValueOnce({
			chromeosdevices: [
				{ deviceId: 'device123', serialNumber: 'SN123' },
				{ deviceId: 'device456', serialNumber: 'SN456' },
			],
		});

		const result = await searchDevices.call(mockContext);

		expect(result).toEqual({
			results: [
				{ name: 'SN123', value: 'device123' },
				{ name: 'SN456', value: 'device456' },
			],
		});
		expect(googleApiRequest).toHaveBeenCalledTimes(1);
		expect(googleApiRequest).toHaveBeenCalledWith(
			'GET',
			'/directory/v1/customer/my_customer/devices/chromeos/',
			{},
			{ customerId: 'my_customer' },
		);
	});

	it('should return an empty array when googleApiRequest response is undefined', async () => {
		(googleApiRequest as jest.Mock).mockResolvedValueOnce(undefined);

		const result = await searchDevices.call(mockContext);

		expect(result).toEqual({ results: [] });
		expect(googleApiRequest).toHaveBeenCalledTimes(1);
	});
});
