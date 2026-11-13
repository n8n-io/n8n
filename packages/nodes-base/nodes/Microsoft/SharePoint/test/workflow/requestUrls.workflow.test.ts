import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

const siteId =
	'mydomain.sharepoint.com,2c712604-1370-44e7-a1f5-426573fda80a,2d2244c3-251a-49ea-93a8-39e1c3a060fe';
const listId = 'd7689e2b-941a-4cd3-bb24-55cddee54294';
const fileId = '01BYE5RZ6QN3ZWBTUFOFD3GSPGOHDJD36K';

describe('Microsoft SharePoint V1 - request URLs', () => {
	beforeAll(() => {
		const encodedSiteId = encodeURIComponent(siteId);
		const file = `/_api/v2.0/sites/${encodedSiteId}/drive/items/${fileId}`;
		const items = `/_api/v2.0/sites/${siteId}/lists/${listId}/items`;
		const encodedItems = `/_api/v2.0/sites/${encodedSiteId}/lists/${listId}/items`;

		nock('https://mydomain.sharepoint.com')
			.patch(file, { name: 'report-final.json' })
			.reply(200, { id: fileId, name: 'report-final.json' })
			.put(`/_api/v2.0/sites/${siteId}/drive/items/${fileId}/content`)
			.reply(200, { id: fileId, name: 'report-final.json' })
			.get(items)
			.query({ $filter: "fields/Title eq 'Budget 2027'" })
			.reply(200, { value: [{ id: '7' }] })
			.patch(`${encodedItems}/7`, { fields: { Title: 'Budget 2027' } })
			.reply(200, { id: '7', fields: { Title: 'Budget 2027' } });
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requestUrls.workflow.json'],
	});
});
