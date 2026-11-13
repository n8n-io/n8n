import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const dtableUuid = '0c9fe6a4-5b3c-4f8e-9a0e-2a1b3c4d5e6f';
const rowId = 'Qtf7xPmoRaiFyQPO1aENTA';
const linkBody = {
	link_id: 'aB3d',
	table_id: '0000',
	other_table_id: '7Kq2',
	other_rows_ids_map: { [rowId]: ['Zp4LmW8sTqKcR2nYvXb1Ae'] },
};
const metadata = {
	tables: [
		{
			_id: '0000',
			name: 'Table1',
			columns: [{ key: '0000', name: 'Name', type: 'text', editable: true }],
		},
	],
};

describe('SeaTable > Workflows', () => {
	const credentials = {
		seaTableApi: {
			environment: 'selfHosted',
			domain: 'https://seatable.example.com/',
			token: 'fake-api-token',
		},
	};

	const mock = nock('https://seatable.example.com');

	beforeAll(() => {
		mock.persist().get('/api/v2.1/dtable/app-access-token/').reply(200, {
			app_name: 'n8n',
			access_token: 'fake-base-token',
			dtable_uuid: dtableUuid,
			workspace_id: 7,
			dtable_name: 'Projects',
		});
	});

	describe('v1', () => {
		const base = `/dtable-server/api/v1/dtables/${dtableUuid}`;

		beforeAll(() => {
			const v1 = nock('https://seatable.example.com');
			v1.get(`${base}/metadata`).times(3).reply(200, { metadata });
			v1.post(`${base}/rows/`, { table_name: 'Table1', row: { Name: 'Nathan' } }).reply(200, {
				_id: rowId,
				'0000': 'Nathan',
			});
			v1.get(`${base}/rows/${rowId}/`).query({ table_name: 'Table1', convert: true }).reply(200, {
				_id: rowId,
				Name: 'Nathan',
				_ctime: '2024-05-02T10:00:00.000+00:00',
				_mtime: '2024-05-02T10:00:00.000+00:00',
			});
			v1.get(`${base}/rows/${rowId}`)
				.query({ table_id: '0000', convert: true })
				.reply(200, { _id: rowId, Name: 'Nathan' });
			v1.get(`${base}/rows/`)
				.query({ table_name: 'Table1', limit: 2 })
				.reply(200, { rows: [{ _id: rowId, Name: 'Nathan' }] });
			v1.put(`${base}/rows/`, {
				table_name: 'Table1',
				row: { Name: 'Nathan 2' },
				row_id: rowId,
			}).reply(200, { success: true });
			v1.delete(`${base}/rows/`, { table_name: 'Table1', row_id: rowId }).reply(200, {
				deleted_rows: 1,
			});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v1.workflow.json'],
			customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
		});
	});

	describe('v2', () => {
		const base = `/api-gateway/api/v2/dtables/${dtableUuid}`;

		beforeAll(() => {
			const v2 = nock('https://seatable.example.com');
			v2.get(`${base}/metadata`).times(2).reply(200, { metadata });
			v2.get(`${base}/metadata/`).times(2).reply(200, { metadata });
			v2.get(`${base}/related-users/`)
				.times(4)
				.reply(200, {
					user_list: [
						{ email: '4f1c2a@auth.local', name: 'nathan', contact_email: 'nathan@n8n.io' },
					],
				});
			v2.post(`${base}/rows/`, { table_name: 'Table1', rows: [{ Name: 'Nathan' }] }).reply(200, {
				first_row: { _id: rowId, Name: 'Nathan' },
			});
			v2.post(`${base}/sql/`, {
				sql: `SELECT * FROM \`Table1\` WHERE _id = '${rowId}'`,
				convert_keys: true,
			}).reply(200, { metadata: [], results: [{ _id: rowId, Name: 'Nathan' }] });
			v2.get(`${base}/rows/`)
				.query({
					table_name: 'Table1',
					view_name: 'Default View',
					limit: 1000,
					convert_keys: true,
				})
				.reply(200, { rows: [{ _id: rowId, Name: 'Nathan' }] });
			v2.post(`${base}/sql`, {
				sql: 'SELECT * FROM `Table1` WHERE `Name` LIKE "%Nat%"',
				convert_keys: true,
			}).reply(200, { metadata: [], results: [{ _id: rowId, Name: 'Nathan' }] });
			v2.put(`${base}/rows/`, {
				table_name: 'Table1',
				updates: [{ row_id: rowId, row: { Name: 'Nathan 2' } }],
			}).reply(200, { success: true });
			v2.delete(`${base}/rows/`, { table_name: 'Table1', row_ids: [rowId] }).reply(200, {
				deleted_rows: 1,
			});
			v2.put(`${base}/lock-rows/`, { table_name: 'Table1', row_ids: [rowId] }).reply(200, {
				success: true,
			});
			v2.put(`${base}/unlock-rows/`, { table_name: 'Table1', row_ids: [rowId] }).reply(200, {
				success: true,
			});
			v2.post(`${base}/snapshot/`, { dtable_name: 'snapshot' }).reply(200, { success: true });
			v2.post(`${base}/links/`, linkBody).reply(200, { success: true });
			v2.post(`${base}/query-links/`, {
				table_id: '0000',
				link_column_key: 'fL9x',
				rows: [{ row_id: rowId, offset: 0, limit: 100 }],
			}).reply(200, {
				[rowId]: [{ row_id: 'Zp4LmW8sTqKcR2nYvXb1Ae', display_value: 'Jan' }],
			});
			v2.delete(`${base}/links/`, linkBody).reply(200, { success: true });
			v2.get('/api/v2.1/dtable/app-download-link/')
				.query({ path: '/images/2024-05/logo.png' })
				.reply(200, {
					download_link: 'https://seatable.example.com/seafhttp/files/1d7f3b2e/logo.png',
				});
			v2.get('/api/v2.1/dtable/app-upload-link/').reply(200, {
				upload_link:
					'https://seatable.example.com/seafhttp/upload-api/4c2e1d9a-7b3f-4e8a-9c1d-5f6a7b8c9d0e',
				parent_path: `/asset/${dtableUuid}`,
				img_relative_path: 'images/2024-05',
				file_relative_path: 'files/2024-05',
			});
			v2.get(`${base}/rows/${rowId}`)
				.query({ table_name: 'Table1', convert_keys: true })
				.reply(200, { _id: rowId, Image: [] });
			v2.post('/seafhttp/upload-api/4c2e1d9a-7b3f-4e8a-9c1d-5f6a7b8c9d0e')
				.query({ 'ret-json': 'true' })
				.reply(200, [{ name: 'notes.txt', size: 5 }]);
			v2.put(`${base}/rows/`, {
				table_name: 'Table1',
				updates: [
					{
						row_id: rowId,
						row: {
							Image: [
								`https://seatable.example.com/workspace/7/asset/${dtableUuid}/images/2024-05/notes.txt`,
							],
						},
					},
				],
			}).reply(200, { success: true });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['v2.workflow.json'],
			customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
		});
	});
});
