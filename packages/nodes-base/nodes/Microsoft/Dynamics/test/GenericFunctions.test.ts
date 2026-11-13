import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { requestPath, requestUrl } from 'n8n-workflow';

import { getEntityFields, getPicklistOptions, microsoftApiRequest } from '../GenericFunctions';

describe('microsoftApiRequest', () => {
	it('should call requestOAuth2 without oAuth2Options so the stored access token is used', async () => {
		const requestOAuth2 = vi.fn().mockResolvedValue({});
		const context = mock<IExecuteFunctions>({
			helpers: mock<IExecuteFunctions['helpers']>({ requestOAuth2 }),
		});
		context.getCredentials.mockResolvedValue({ subdomain: 'org', region: 'crm.dynamics.com' });

		await microsoftApiRequest.call(context, 'GET', requestPath`/accounts`);

		expect(requestOAuth2).toHaveBeenCalledWith('microsoftDynamicsOAuth2Api', expect.any(Object));
		expect(requestOAuth2.mock.calls[0]).toHaveLength(2);
	});

	it('should encode a path value that contains a slash', async () => {
		const requestOAuth2 = vi.fn().mockResolvedValue({});
		const context = mock<IExecuteFunctions>({
			helpers: mock<IExecuteFunctions['helpers']>({ requestOAuth2 }),
		});
		context.getCredentials.mockResolvedValue({ subdomain: 'org', region: 'crm.dynamics.com' });

		await microsoftApiRequest.call(context, 'GET', requestPath`/accounts(${'7c6a8b3e/contacts'})`);

		expect(String(requestOAuth2.mock.calls[0][1].uri)).toBe(
			'https://org.crm.dynamics.com/api/data/v9.2/accounts(7c6a8b3e%2Fcontacts)',
		);
	});

	it('should build the URL from the subdomain and region with requestUrl', async () => {
		const requestOAuth2 = vi.fn().mockResolvedValue({});
		const context = mock<IExecuteFunctions>({
			helpers: mock<IExecuteFunctions['helpers']>({ requestOAuth2 }),
		});
		context.getCredentials.mockResolvedValue({ subdomain: 'org', region: 'crm4.dynamics.com' });

		await microsoftApiRequest.call(context, 'GET', requestPath`/accounts`);

		expect(requestOAuth2.mock.calls[0][1].uri).toEqual(
			requestUrl`https://org.crm4.dynamics.com/api/data/v9.2/accounts`,
		);
	});

	it('should send a next-page link unchanged', async () => {
		const requestOAuth2 = vi.fn().mockResolvedValue({});
		const context = mock<IExecuteFunctions>({
			helpers: mock<IExecuteFunctions['helpers']>({ requestOAuth2 }),
		});
		context.getCredentials.mockResolvedValue({ subdomain: 'org', region: 'crm.dynamics.com' });
		const nextLink =
			'https://org.crm.dynamics.com/api/data/v9.2/accounts?$skiptoken=%3Ccookie%20pagenumber=%222%22/%3E';

		await microsoftApiRequest.call(context, 'GET', requestPath`/accounts`, {}, {}, nextLink);

		expect(requestOAuth2.mock.calls[0][1].uri).toBe(nextLink);
	});
});

describe('load options requests', () => {
	const setup = (response: object) => {
		const requestOAuth2 = vi.fn().mockResolvedValue(response);
		const context = mock<ILoadOptionsFunctions>({
			helpers: mock<ILoadOptionsFunctions['helpers']>({ requestOAuth2 }),
		});
		context.getCredentials.mockResolvedValue({ subdomain: 'org', region: 'crm.dynamics.com' });
		return { context, requestOAuth2 };
	};

	it('should request the picklist attribute metadata', async () => {
		const { context, requestOAuth2 } = setup({ OptionSet: { Options: [] } });

		await getPicklistOptions.call(context, 'account', 'accountcategorycode');

		expect(String(requestOAuth2.mock.calls[0][1].uri)).toBe(
			"https://org.crm.dynamics.com/api/data/v9.2/EntityDefinitions(LogicalName='account')/Attributes(LogicalName='accountcategorycode')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options),GlobalOptionSet($select=Options)",
		);
	});

	it('should request the entity attributes', async () => {
		const { context, requestOAuth2 } = setup({ value: [] });

		await getEntityFields.call(context, 'account');

		expect(String(requestOAuth2.mock.calls[0][1].uri)).toBe(
			"https://org.crm.dynamics.com/api/data/v9.2/EntityDefinitions(LogicalName='account')/Attributes",
		);
	});
});
