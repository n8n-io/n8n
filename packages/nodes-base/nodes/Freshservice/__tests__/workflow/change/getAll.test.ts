import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { changeGetMany } from '../apiResponses';
import { credentials } from '../credentials';

describe('Freshservice > Change > Get Many', () => {
	beforeAll(() => {
		// the changes endpoint expects the filters as dedicated query params
		// (view, order_type, updated_since), not inside a `query` string
		nock('https://n8n-test.freshservice.com')
			.get('/api/v2/changes')
			.query({
				view: 'my_open',
				order_type: 'asc',
				updated_since: '2025-09-01T00:00:00.000Z',
				page: 1,
			})
			.reply(200, changeGetMany);
	});

	new NodeTestHarness().setupTests({ credentials });
});
