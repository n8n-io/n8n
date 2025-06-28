import type { ICredentialDataDecryptedObject, IExecuteFunctions } from 'n8n-workflow';

import * as transport from '../../../v2/transport';

const fakeExecute = (credentials: ICredentialDataDecryptedObject, result: unknown) => {
	const fakeExecuteFunction = {
		async getCredentials(): Promise<ICredentialDataDecryptedObject> {
			return credentials;
		},

		helpers: {
			requestWithAuthentication: jest.fn().mockResolvedValue(result),
		},
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};

describe('Test MicrosoftOutlookV2, transport => microsoftApiRequest', () => {
	it('should call microsoftApiRequest using the defined service root', async () => {
		const execute = fakeExecute(
			{
				graphEndpoint: 'https://foo.bar',
				useShared: false,
				userPrincipalName: 'test-principal',
			},
			'foo',
		);

		const result: string = (await transport.microsoftApiRequest.call(
			execute,
			'GET',
			'/foo',
		)) as string;

		expect(result).toEqual('foo');
		expect(execute.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(execute.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'microsoftOutlookOAuth2Api',
			{
				headers: { 'Content-Type': 'application/json' },
				method: 'GET',
				qs: {},
				uri: 'https://foo.bar/v1.0/me/foo',
				json: true,
			},
		);
	});

	it('should call microsoftApiRequest using the service root if no root is provided', async () => {
		const execute = fakeExecute(
			{
				useShared: false,
				userPrincipalName: 'test-principal',
			},
			'foo',
		);

		const result: string = (await transport.microsoftApiRequest.call(
			execute,
			'GET',
			'/foo',
		)) as string;

		expect(result).toEqual('foo');
		expect(execute.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(execute.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'microsoftOutlookOAuth2Api',
			{
				headers: { 'Content-Type': 'application/json' },
				method: 'GET',
				qs: {},
				uri: 'https://graph.microsoft.com/v1.0/me/foo',
				json: true,
			},
		);
	});
});
