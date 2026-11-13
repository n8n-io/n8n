import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';
import type { ILoadOptionsFunctions, IRequestOptions } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import { LinkedIn } from '../LinkedIn.node';

describe('LinkedIn > Workflows', () => {
	const credentials = {
		linkedInOAuth2Api: {
			legacy: false,
			oauthTokenData: {
				access_token: 'fake-access-token',
			},
		},
	};

	const uploadPath = '/dms-uploads/sp/v2/D4D10AQH1/uploadedImage/0';
	const uploadQuery = { ca: 'vector_feedshare', cn: 'uploads', v: 'beta', ut: '2abc+def' };
	const uploadUrl = (id: string) =>
		`https://www.linkedin.com${uploadPath}${id}?ca=vector_feedshare&cn=uploads&v=beta&ut=2abc%2Bdef`;

	beforeAll(() => {
		const api = nock('https://api.linkedin.com');
		api
			.post('/rest/posts', (body: { commentary?: string }) => body.commentary === 'Hello from n8n')
			.reply(201, {}, { 'x-restli-id': 'urn:li:share:7000000000000000001' });
		api
			.post('/rest/images', { initializeUploadRequest: { owner: 'urn:li:person:AbCdEf1234' } })
			.query({ action: 'initializeUpload' })
			.reply(200, { value: { uploadUrl: uploadUrl('1'), image: 'urn:li:image:C4D10AQ1' } });
		api
			.post('/rest/images', { initializeUploadRequest: { owner: 'urn:li:organization:12345678' } })
			.query({ action: 'initializeUpload' })
			.reply(200, { value: { uploadUrl: uploadUrl('2'), image: 'urn:li:image:C4D10AQ2' } });
		api
			.post('/rest/posts', (body: { commentary?: string }) => body.commentary === 'An image')
			.reply(201, {}, { 'x-restli-id': 'urn:li:share:7000000000000000002' });
		api
			.post('/rest/posts', (body: { commentary?: string }) => body.commentary === 'An article')
			.reply(201, {}, { 'x-restli-id': 'urn:li:share:7000000000000000003' });

		const upload = nock('https://www.linkedin.com');
		upload.post(`${uploadPath}1`).query(uploadQuery).reply(201);
		upload.post(`${uploadPath}2`).query(uploadQuery).reply(201);
	});

	new NodeTestHarness().setupTests({
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});

describe('LinkedIn > Person dropdown', () => {
	const urls = async (authentication: string, legacy: boolean) => {
		const requested: string[] = [];
		const requestOAuth2 = jest.fn(async (_type: string, options: IRequestOptions) => {
			requested.push(String(options.url));
			return { statusCode: 200, body: { sub: 'AbCdEf1234', given_name: 'Nathan' } };
		});
		const functions = mock<ILoadOptionsFunctions>({ helpers: { requestOAuth2 } });
		jest.mocked(functions.getNodeParameter).mockReturnValue(authentication);
		jest.mocked(functions.getCredentials).mockResolvedValue({ legacy });
		await new LinkedIn().methods.loadOptions.getPersonUrn.call(functions);
		return requested;
	};

	it('should request the user info for standard authentication', async () => {
		expect(await urls('standard', false)).toEqual(['https://api.linkedin.com/v2/userinfo']);
	});

	it('should request the profile for legacy standard authentication', async () => {
		expect(await urls('standard', true)).toEqual(['https://api.linkedin.com/v2/me']);
	});

	it('should request the profile for community management authentication', async () => {
		expect(await urls('communityManagement', false)).toEqual(['https://api.linkedin.com/v2/me']);
	});
});
