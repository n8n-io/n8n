import { CredentialsHelper } from '@nodes-testing/credentials-helper';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { ICredentialDataDecryptedObject, IHttpRequestHelper, INode } from 'n8n-workflow';
import nock from 'nock';

import { MicrosoftEntraServicePrincipalApi } from '../../../../credentials/MicrosoftEntraServicePrincipalApi.credentials';

// Pagination sends each page with `simple: false`, so a 401 resolves instead of throwing.
// The credential must still get a new token through `preAuthentication`.
//
// The harness CredentialsHelper has a no-op `preAuthentication`. Here it follows the logic
// in packages/cli/src/credentials-helper.ts: call the credential hook when the expirable
// field is empty or the token expired, store the result, and merge it into the credentials.
// An in-memory store acts as the credentials table, so each read returns a fresh copy.

const TYPE = 'microsoftEntraServicePrincipalApi';
const TENANT = '11111111-1111-1111-1111-111111111111';
const GRAPH = 'https://graph.microsoft.com';
const LOGIN = 'https://login.microsoftonline.com';
const MESSAGES_PATH = '/v1.0/users/test-user/mailFolders/inbox/messages';

const invalidTokenLifetime = {
	error: { code: 'InvalidAuthenticationToken', message: 'Invalid token lifetime.' },
};

describe('HTTP Request Node - pagination with a preAuthentication credential', () => {
	let store: Record<string, ICredentialDataDecryptedObject>;
	let expiredTokenRequests: number;
	let tokenRequests: number;

	beforeEach(() => {
		store = {
			[TYPE]: {
				accessToken: 'EXPIRED_TOKEN',
				authentication: 'clientSecret',
				tenantId: TENANT,
				clientId: '22222222-2222-2222-2222-222222222222',
				clientSecret: 'test-client-secret',
				graphApiBaseUrl: GRAPH,
			},
		};
		expiredTokenRequests = 0;
		tokenRequests = 0;

		const credentialType = new MicrosoftEntraServicePrincipalApi();
		vi.spyOn(CredentialsHelper.prototype, 'getDecrypted').mockImplementation(
			async (_additionalData, _nodeCredentials, type) => ({ ...store[type] }),
		);
		vi.spyOn(CredentialsHelper.prototype, 'preAuthentication').mockImplementation(
			async (
				helpers: IHttpRequestHelper,
				credentials: ICredentialDataDecryptedObject,
				typeName: string,
				node: INode,
				credentialsExpired: boolean,
			) => {
				if (credentials.accessToken !== '' && !credentialsExpired) return undefined;
				const output = await credentialType.preAuthentication.call(helpers, credentials);
				if (!node.credentials) return undefined;
				store[typeName] = { ...store[typeName], ...output };
				return Object.assign(credentials, output);
			},
		);

		// The expired token gets a 401 without `@odata.nextLink`. The interceptor persists,
		// so node retries also get it when the token is not renewed.
		nock(GRAPH)
			.persist()
			.get(MESSAGES_PATH)
			.matchHeader('Authorization', 'Bearer EXPIRED_TOKEN')
			.reply(401, () => {
				expiredTokenRequests++;
				return invalidTokenLifetime;
			});
		nock(LOGIN)
			.post(`/${TENANT}/oauth2/v2.0/token`)
			.reply(200, () => {
				tokenRequests++;
				return { token_type: 'Bearer', expires_in: 3599, access_token: 'NEW_TOKEN' };
			});
		nock(GRAPH)
			.get(MESSAGES_PATH)
			.matchHeader('Authorization', 'Bearer NEW_TOKEN')
			.matchHeader('Prefer', 'outlook.body-content-type="text"')
			.reply(200, {
				value: [{ id: 'msg-1' }],
				'@odata.nextLink': `${GRAPH}${MESSAGES_PATH}?%24skip=1`,
			});
		nock(GRAPH)
			.get(MESSAGES_PATH)
			.query({ $skip: '1' })
			.matchHeader('Authorization', 'Bearer NEW_TOKEN')
			.reply(200, { value: [{ id: 'msg-2' }] });
	});

	afterEach(() => {
		nock.cleanAll();
		vi.restoreAllMocks();
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['workflow.pagination-401.json'],
		customAssertions: () => {
			// One 401 renews the token once, and both pages load with the new token
			expect(expiredTokenRequests).toBe(1);
			expect(tokenRequests).toBe(1);
			expect(store[TYPE].accessToken).toBe('NEW_TOKEN');
		},
	});
});
