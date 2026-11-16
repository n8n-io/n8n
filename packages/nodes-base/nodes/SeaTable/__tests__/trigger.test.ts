import { testPollingTriggerNode } from '@test/nodes/TriggerHelpers';
import type { INodeTypeBaseDescription } from 'n8n-workflow';
import nock from 'nock';

import { SeaTableTriggerV1 } from '../v1/SeaTableTriggerV1.node';
import { SeaTableTriggerV2 } from '../v2/SeaTableTriggerV2.node';

const host = 'https://seatable.example.com';
const dtableUuid = '0c9fe6a4-5b3c-4f8e-9a0e-2a1b3c4d5e6f';
const rowId = 'Qtf7xPmoRaiFyQPO1aENTA';
const credential = { environment: 'selfHosted', domain: `${host}/`, token: 'fake-api-token' };
const baseDescription: INodeTypeBaseDescription = {
	displayName: 'SeaTable Trigger',
	name: 'seaTableTrigger',
	group: ['trigger'],
	description: 'Starts the workflow when SeaTable events occur',
};

describe('SeaTable Trigger', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.enableNetConnect();
	});

	beforeEach(() => {
		nock(host).get('/api/v2.1/dtable/app-access-token/').reply(200, {
			access_token: 'fake-base-token',
			dtable_uuid: dtableUuid,
			workspace_id: 7,
		});
	});

	afterEach(() => {
		expect(nock.pendingMocks()).toEqual([]);
		nock.cleanAll();
	});

	it('v1 queries the rows of the base', async () => {
		nock(host)
			.post(`/dtable-db/api/v1/query/${dtableUuid}/`, { sql: 'SELECT * FROM `Table1` LIMIT 1' })
			.reply(200, {
				metadata: [{ key: '0000', name: 'Name', type: 'text' }],
				results: [{ _id: rowId, Name: 'Nathan' }],
			});

		const { response } = await testPollingTriggerNode(new SeaTableTriggerV1(baseDescription), {
			mode: 'manual',
			credential,
			node: { parameters: { tableName: 'Table1', event: 'rowCreated', simple: false } },
		});

		expect(response).toEqual([[{ json: { Name: 'Nathan' } }]]);
	});

	it('v2 reads the rows of a view', async () => {
		const base = `/api-gateway/api/v2/dtables/${dtableUuid}`;
		nock(host)
			.get(`${base}/metadata/`)
			.reply(200, { metadata: { tables: [{ name: 'Table1', columns: [] }] } })
			.get(`${base}/rows/`)
			.query({ table_name: 'Table1', view_name: 'Default View', limit: 3, convert_keys: true })
			.reply(200, { rows: [{ _id: rowId, Name: 'Nathan' }] })
			.get(`${base}/related-users/`)
			.reply(200, { user_list: [] });

		const { response } = await testPollingTriggerNode(new SeaTableTriggerV2(baseDescription), {
			mode: 'manual',
			credential,
			node: {
				parameters: {
					event: 'newRow',
					tableName: 'Table1',
					viewName: 'Default View',
					options: { convert: true, simple: true },
				},
			},
		});

		expect(response).toEqual([[{ json: { Name: 'Nathan' } }]]);
	});

	it('v2 queries new assets with SQL', async () => {
		const base = `/api-gateway/api/v2/dtables/${dtableUuid}`;
		nock(host)
			.post(`${base}/sql`)
			.reply(200, { metadata: [{ name: 'Signature', type: 'digital-sign' }], results: [] })
			.get(`${base}/related-users/`)
			.reply(200, { user_list: [] });

		const { response } = await testPollingTriggerNode(new SeaTableTriggerV2(baseDescription), {
			mode: 'manual',
			credential,
			node: {
				parameters: {
					event: 'newAsset',
					tableName: 'Table1',
					assetColumn: 'Signature',
					options: { convert: true, simple: true },
				},
			},
		});

		expect(response).toBeNull();
	});
});
