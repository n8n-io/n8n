import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import {
	archiveItemResponse,
	createItemResponse,
	getItemResponse,
	getItemsResponse,
	updateItemResponse,
} from './apiResponses';
import { credentials } from './credentials';

// Skipped until version 2 is registered in MondayCom.node.ts (the final PR of
// the V2 series): the harness resolves nodes through the versioned wrapper, so
// typeVersion 2 workflows cannot run before then. To run locally, register
// version 2 in the wrapper and replace `describe.skip` with `describe`.
// eslint-disable-next-line n8n-local-rules/no-skipped-tests
describe.skip('MondayCom V2 > Item Workflows', () => {
	beforeAll(() => {
		// Every GraphQL operation POSTs to the same endpoint, so the mocks
		// are matched by the query/mutation each operation sends.
		const matchQuery =
			(fragment: string) =>
			(body: Record<string, unknown>): boolean =>
				typeof body.query === 'string' && body.query.includes(fragment);

		const mock = nock('https://api.monday.com');
		mock.post('/v2', matchQuery('create_item(')).reply(200, createItemResponse);
		mock.post('/v2', matchQuery('change_multiple_column_values(')).reply(200, updateItemResponse);
		mock.post('/v2', matchQuery('items(ids: $ids)')).reply(200, getItemResponse);
		mock.post('/v2', matchQuery('items_page(')).reply(200, getItemsResponse);
		mock.post('/v2', matchQuery('archive_item(')).reply(200, archiveItemResponse);
	});

	new NodeTestHarness().setupTests({ credentials });
});
