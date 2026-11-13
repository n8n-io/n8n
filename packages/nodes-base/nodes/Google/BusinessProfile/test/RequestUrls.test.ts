import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchAccounts, searchLocations, searchPosts, searchReviews } from '../GenericFunctions';

describe('GenericFunctions - list search request URLs', () => {
	const httpRequestWithAuthentication = vi.fn();
	const parameters: Record<string, { value: string }> = {
		account: { value: 'accounts/104578213969250394851' },
		location: { value: 'locations/7183021945602238911' },
	};

	const mockContext = {
		helpers: { httpRequestWithAuthentication },
		getNodeParameter: (name: string) => parameters[name],
		getNode: vi.fn(),
	} as unknown as ILoadOptionsFunctions;

	const requestedUrl = () => {
		const [, options] = httpRequestWithAuthentication.mock.calls[0] as [string, { url: unknown }];
		return String(options.url);
	};

	beforeEach(() => {
		httpRequestWithAuthentication.mockReset();
	});

	it('should request the accounts', async () => {
		httpRequestWithAuthentication.mockResolvedValue({ accounts: [] });

		await searchAccounts.call(mockContext);

		expect(requestedUrl()).toBe('https://mybusinessaccountmanagement.googleapis.com/v1/accounts');
	});

	it('should request the locations of the account', async () => {
		httpRequestWithAuthentication.mockResolvedValue({ locations: [] });

		await searchLocations.call(mockContext);

		expect(requestedUrl()).toBe(
			'https://mybusinessbusinessinformation.googleapis.com/v1/accounts/104578213969250394851/locations',
		);
	});

	it('should request the reviews of the location', async () => {
		httpRequestWithAuthentication.mockResolvedValue({ reviews: [] });

		await searchReviews.call(mockContext);

		expect(requestedUrl()).toBe(
			'https://mybusiness.googleapis.com/v4/accounts/104578213969250394851/locations/7183021945602238911/reviews',
		);
	});

	it('should request the posts of the location', async () => {
		httpRequestWithAuthentication.mockResolvedValue({ localPosts: [] });

		await searchPosts.call(mockContext);

		expect(requestedUrl()).toBe(
			'https://mybusiness.googleapis.com/v4/accounts/104578213969250394851/locations/7183021945602238911/localPosts',
		);
	});
});
