import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

const item = (id: string, title: string) => ({
	'@odata.etag': '"07bfcdd5-450d-48ce-8dc3-04f7f59edc5f,1"',
	createdDateTime: '2025-03-12T22:18:18Z',
	id,
	lastModifiedDateTime: '2025-03-12T22:18:18Z',
	webUrl: `https://mydomain.sharepoint.com/sites/site1/Lists/name%20list/${id}_.000`,
	'fields@odata.navigationLink': `sites/site1/lists/list1/items/${id}/fields`,
	fields: {
		'@odata.etag': '"07bfcdd5-450d-48ce-8dc3-04f7f59edc5f,1"',
		Title: title,
	},
});

const simplifyQuery =
	'%24expand=fields%28select%3DTitle%29&%24select=id%2CcreatedDateTime%2ClastModifiedDateTime%2CwebUrl';

const nextPage = `/sites(%27site1%27)/lists(%27list1%27)/items?%24skiptoken=UGFnZWQ9VFJVRSZwX0lEPTE&%24top=1&${simplifyQuery}`;

describe('Microsoft SharePoint Node', () => {
	const { baseUrl } = credentials.microsoftSharePointOAuth2Api;
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAllReturnAllSimplify.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'get',
					path: `/sites/site1/lists/list1/items?${simplifyQuery}`,
					statusCode: 200,
					responseBody: {
						value: [item('item1', 'Item 1')],
						'@odata.nextLink': `https://mydomain.sharepoint.com/_api/v2.0${nextPage}`,
					},
				},
				{
					method: 'get',
					path: nextPage,
					statusCode: 200,
					responseBody: { value: [item('item2', 'Item 2')] },
				},
			],
		},
	});
});
