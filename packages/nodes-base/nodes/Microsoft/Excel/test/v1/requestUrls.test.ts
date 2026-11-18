import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

const workbook = '/drive/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook';
const worksheet = `${workbook}/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D`;
const table = `${worksheet}/tables/%7B317CA469-7D1C-4A5D-9B0B-424444BF0336%7D`;
const columns = { value: [{ name: 'id' }, { name: 'name' }] };
const sheet5 = {
	id: '{B1A2C3D4-0000-4E5F-8A9B-0C1D2E3F4A5B}',
	name: 'Sheet5',
	position: 4,
	visibility: 'Visible',
};

describe('Microsoft Excel v1 - request URLs', () => {
	beforeAll(() => {
		const graph = nock('https://graph.microsoft.com/v1.0/me');

		graph
			.get(`${table}/columns`)
			.reply(200, columns)
			.post(`${workbook}/createSession`)
			.reply(200, { id: 'session-1' })
			.post(`${table}/rows/add`)
			.reply(200, { index: 3, values: [[null, null]] })
			.post(`${workbook}/closeSession`)
			.reply(204);

		graph.get(`${table}/columns`).query({ $top: 2 }).reply(200, columns);

		graph
			.get(`${table}/rows`)
			.query({ $top: 2 })
			.reply(200, { value: [{ index: 0, values: [[1, 'Sam']] }] });

		graph
			.get(`${table}/rows`)
			.query({ $top: 100, $skip: 0 })
			.reply(200, { value: [{ values: [[1, 'Sam']] }, { values: [[2, 'Jon']] }] })
			.get(`${table}/rows`)
			.query({ $top: 100, $skip: 100 })
			.reply(200, { value: [] });

		for (let i = 0; i < 2; i++) {
			graph
				.get(`${table}/columns`)
				.query({ $select: 'name', $top: 100, $skip: 0 })
				.reply(200, columns)
				.get(`${table}/columns`)
				.query({ $select: 'name', $top: 100, $skip: 100 })
				.reply(200, { value: [] });
		}

		graph
			.post(`${workbook}/createSession`)
			.reply(200, { id: 'session-2' })
			.post(`${workbook}/worksheets/add`, { name: 'Sheet5' })
			.reply(200, sheet5)
			.post(`${workbook}/closeSession`)
			.reply(204);

		graph
			.get("/drive/root/search(q='.xlsx')")
			.query({ $top: 2 })
			.reply(200, { value: [{ id: '01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I', name: 'Budget.xlsx' }] });

		graph
			.get(`${workbook}/worksheets`)
			.query({ $top: 2 })
			.reply(200, { value: [{ id: '{A0883CFE-D27E-4ECC-B94B-981830AAD55B}', name: 'Sheet1' }] });

		graph.get(`${worksheet}/range(address='A1:B3')`).reply(200, {
			values: [
				['id', 'name'],
				[1, 'Sam'],
				[2, 'Jon'],
			],
		});
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requestUrls.workflow.json'],
	});
});
