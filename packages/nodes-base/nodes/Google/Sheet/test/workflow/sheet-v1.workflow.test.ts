import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const spreadsheet = '/v4/spreadsheets/1kZ8pQ4mV7xR2tN9wL3cH6bJ0sF5gD1aY8uE4iO7qW2M';

const batchUpdateResponse = {
	spreadsheetId: '1kZ8pQ4mV7xR2tN9wL3cH6bJ0sF5gD1aY8uE4iO7qW2M',
	replies: [{}],
};

describe('Google Sheets v1 Node - request URLs', () => {
	beforeAll(() => {
		nock('https://sheets.googleapis.com')
			.get(`${spreadsheet}/values/Q3%20Orders!A:B`)
			.query({ valueRenderOption: 'UNFORMATTED_VALUE' })
			.reply(200, {
				values: [
					['order_id', 'status'],
					['ORD-1042', 'pending'],
				],
			})
			.get(`${spreadsheet}/values/Q3%20Orders!A1:B1`)
			.query({ valueRenderOption: 'UNFORMATTED_VALUE' })
			.times(4)
			.reply(200, { values: [['order_id', 'status']] })
			.get(`${spreadsheet}/values/Q3%20Orders!A1:A`)
			.query({ valueRenderOption: 'UNFORMATTED_VALUE' })
			.times(2)
			.reply(200, { values: [['order_id'], ['ORD-1042']] })
			.post(`${spreadsheet}/values:batchUpdate`)
			.times(2)
			.reply(200, { totalUpdatedRows: 1 })
			.post(`${spreadsheet}/values/Q3%20Orders!A:B:append`)
			.query({ valueInputOption: 'RAW' })
			.times(2)
			.reply(200, { updates: { updatedRange: "'Q3 Orders'!A3:B3", updatedRows: 1 } })
			.get(`${spreadsheet}/values/A:B`)
			.query({ valueRenderOption: 'UNFORMATTED_VALUE' })
			.reply(200, {
				values: [
					['order_id', 'status'],
					['ORD-1042', 'pending'],
				],
			})
			.post(`${spreadsheet}/values/Q3%20Orders!A2:B10:clear`)
			.reply(200, { clearedRange: "'Q3 Orders'!A2:B10" })
			.post(`${spreadsheet}:batchUpdate`)
			.reply(200, batchUpdateResponse)
			.post(`${spreadsheet}:batchUpdate`)
			.reply(200, {
				spreadsheetId: '1kZ8pQ4mV7xR2tN9wL3cH6bJ0sF5gD1aY8uE4iO7qW2M',
				replies: [{ addSheet: { properties: { sheetId: 905317462, title: 'Q4 Orders' } } }],
			})
			.post(`${spreadsheet}:batchUpdate`)
			.reply(200, batchUpdateResponse)
			.post('/v4/spreadsheets')
			.reply(200, {
				spreadsheetId: '1Hq3nW6tR9yU2iO5pA8sD1fG4hJ7kL0zX3cV6bN9mQ2E',
				properties: { title: 'Q4 Planning' },
			});
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleSheetsOAuth2Api: {
				scope: 'https://www.googleapis.com/auth/spreadsheets',
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['sheet-v1.workflow.json'],
	});
});
