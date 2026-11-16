import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const siteId =
	'contoso.sharepoint.com,2c712604-1370-44e7-a1f5-426573fda80a,2d2244c3-251a-49ea-93a8-39e1c3a060fe';
const listId = 'd7689e2b-941a-4cd3-bb24-55cddee54294';
const fileId = '01BYE5RZ6QN3ZWBTUFOFD3GSPGOHDJD36K';
const folderId = '01BYE5RZ2KXWOZ3HJCZVA2XJEFBJCB4WXT';
const downloadPath = '/sites/Marketing/_layouts/15/download.aspx';

describe('Microsoft SharePoint V2 - request URLs', () => {
	beforeAll(() => {
		const site = `/v1.0/sites/${siteId}`;
		const list = `${site}/lists/${listId}`;
		const items = `${list}/items`;
		const file = `${site}/drive/items/${fileId}`;

		nock('https://graph.microsoft.com')
			.get(list)
			.reply(200, { id: listId, displayName: 'Projects' })
			.get(`${site}/lists`)
			.reply(200, {
				value: [{ id: listId, displayName: 'Projects' }],
				'@odata.nextLink': `https://graph.microsoft.com${site}/lists?$skiptoken=page2`,
			})
			.get(`${site}/lists`)
			.query({ $skiptoken: 'page2' })
			.reply(200, {
				value: [{ id: 'f2c5a8b1-6a0e-4c6b-9d3e-2b8f1a7c4e90', displayName: 'Documents' }],
			})
			.get(`${items}/7`)
			.query({ $expand: 'fields' })
			.reply(200, { id: '7', fields: { Title: 'Quarterly review' } })
			.get(items)
			.reply(200, { value: [{ id: '7', fields: { Title: 'Quarterly review' } }] })
			.delete(`${items}/8`)
			.reply(204)
			.post(items, { fields: { Title: 'Quarterly review' } })
			.reply(201, { id: '9', fields: { Title: 'Quarterly review' } })
			.patch(`${items}/7/fields`, { Title: 'Quarterly review (final)' })
			.reply(200, { Title: 'Quarterly review (final)' })
			.get(`${items}/7`)
			.query({ $expand: 'fields' })
			.reply(200, { id: '7', fields: { Title: 'Quarterly review (final)' } })
			.get('/v1.0/sites/contoso.sharepoint.com:/sites/Marketing')
			.query({ $select: 'id' })
			.reply(200, { id: siteId })
			.get(items)
			.query(true)
			.reply(200, { value: [] })
			.post(items, { fields: { Title: 'Budget 2027' } })
			.reply(201, { id: '10', fields: { Title: 'Budget 2027' } })
			.get(file)
			.reply(200, {
				id: fileId,
				name: 'report.txt',
				file: { mimeType: 'text/plain' },
				'@microsoft.graph.downloadUrl': `https://contoso.sharepoint.com${downloadPath}?UniqueId=7a1c&tempauth=token`,
			})
			.put(`${site}/drive/items/${folderId}:/report.txt:/content`)
			.reply(201, { id: '01BYE5RZ5MYLM2SMX75ZBIPQZIHT6OAYPB', name: 'report.txt' })
			.patch(file, { name: 'report-final.txt' })
			.reply(200, { id: fileId, name: 'report-final.txt' })
			.put(`${file}/content`)
			.reply(200, { id: fileId, name: 'report-final.txt' });

		nock('https://contoso.sharepoint.com')
			.get(downloadPath)
			.query({ UniqueId: '7a1c', tempauth: 'token' })
			.reply(200, 'report body', { 'content-type': 'text/plain' });
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			microsoftOAuth2Api: {
				grantType: 'authorizationCode',
				authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
				accessTokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
				clientId: 'CLIENT_ID',
				clientSecret: 'CLIENT_SECRET',
				authentication: 'body',
				graphApiBaseUrl: 'https://graph.microsoft.com',
				oauthTokenData: { token_type: 'Bearer', access_token: 'ACCESSTOKEN' },
			},
		},
		workflowFiles: ['requestUrls.workflow.json'],
	});
});
