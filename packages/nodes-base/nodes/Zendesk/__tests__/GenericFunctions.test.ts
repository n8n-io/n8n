import { zendeskApiRequest } from '../GenericFunctions';

const MARKETPLACE_HEADERS = {
	'X-Zendesk-Marketplace-Name': 'n8n',
	'X-Zendesk-Marketplace-Organization-Id': 'org-1',
	'X-Zendesk-Marketplace-App-Id': 'app-1',
};

describe('Zendesk > GenericFunctions', () => {
	const mockExecuteFunctions: any = {
		helpers: {
			requestWithAuthentication: vi.fn(),
		},
		getCredentials: vi.fn(),
		getNodeParameter: vi.fn(),
		getNode: vi.fn(),
	};

	function setUp(
		authentication: string,
		credentials: Record<string, string> = { subdomain: 'n8n' },
	) {
		vi.clearAllMocks();
		mockExecuteFunctions.getNodeParameter.mockReturnValue(authentication);
		mockExecuteFunctions.getCredentials.mockResolvedValue(credentials);
		mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({});
	}

	function sentHeaders() {
		const [, options] = mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0];
		return options.headers;
	}

	it('should send the marketplace headers when the credential provides all of them', async () => {
		setUp('oAuth2', {
			subdomain: 'n8n',
			marketplaceName: 'n8n',
			marketplaceOrganizationId: 'org-1',
			marketplaceAppId: 'app-1',
		});

		await zendeskApiRequest.call(mockExecuteFunctions, 'GET', '/tickets');

		expect(sentHeaders()).toEqual(MARKETPLACE_HEADERS);
	});

	it('should leave the headers untouched when one of them is missing', async () => {
		setUp('oAuth2', {
			subdomain: 'n8n',
			marketplaceName: 'n8n',
			marketplaceOrganizationId: 'org-1',
		});

		await zendeskApiRequest.call(mockExecuteFunctions, 'GET', '/tickets');

		expect(sentHeaders()).toBeUndefined();
	});

	it('should send no marketplace headers for API token authentication', async () => {
		setUp('apiToken');

		await zendeskApiRequest.call(mockExecuteFunctions, 'GET', '/tickets');

		expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('zendeskApi');
		expect(sentHeaders()).toBeUndefined();
	});

	it('should keep headers passed in by the caller', async () => {
		setUp('oAuth2', {
			subdomain: 'n8n',
			marketplaceName: 'n8n',
			marketplaceOrganizationId: 'org-1',
			marketplaceAppId: 'app-1',
		});

		await zendeskApiRequest.call(mockExecuteFunctions, 'GET', '/tickets', {}, {}, undefined, {
			headers: { 'Content-Type': 'application/json' },
		});

		expect(sentHeaders()).toEqual({
			...MARKETPLACE_HEADERS,
			'Content-Type': 'application/json',
		});
	});
});
