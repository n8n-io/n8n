import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const spreadsheet = '/v4/spreadsheets/1kZ8pQ4mV7xR2tN9wL3cH6bJ0sF5gD1aY8uE4iO7qW2M';

const sheetProperties = {
	sheets: [
		{
			properties: {
				sheetId: 1843902751,
				title: 'Q3 Orders',
				index: 0,
				sheetType: 'GRID',
				gridProperties: { rowCount: 1000, columnCount: 26 },
			},
		},
	],
};

const sheetValues = {
	range: "'Q3 Orders'!A1:Z1000",
	majorDimension: 'ROWS',
	values: [
		['order_id', 'status'],
		['ORD-1042', 'pending'],
	],
};

describe('Google Sheets Node - request URLs', () => {
	beforeAll(() => {
		nock('https://sheets.googleapis.com')
			.get(spreadsheet)
			.query({ fields: 'sheets.properties' })
			.times(8)
			.reply(200, sheetProperties)
			.get(`${spreadsheet}/values/Q3%20Orders!A1:C20`)
			.query(true)
			.reply(200, sheetValues)
			.get(`${spreadsheet}/values/'Q3%20Orders'`)
			.query(true)
			.times(4)
			.reply(200, sheetValues)
			.post(`${spreadsheet}/values/Q3%20Orders!3:3:append`)
			.query({ valueInputOption: 'USER_ENTERED' })
			.reply(200, { updates: { updatedRange: "'Q3 Orders'!A3:B3", updatedRows: 1 } })
			.post(`${spreadsheet}/values:batchUpdate`)
			.reply(200, { totalUpdatedRows: 1 })
			.post(`${spreadsheet}:batchUpdate`)
			.reply(200, { spreadsheetId: '1kZ8pQ4mV7xR2tN9wL3cH6bJ0sF5gD1aY8uE4iO7qW2M', replies: [{}] })
			.put(`${spreadsheet}/values/Q3%20Orders!3:3`)
			.query({ valueInputOption: 'USER_ENTERED' })
			.reply(200, { updatedRange: "'Q3 Orders'!A3:B3", updatedRows: 1 })
			.get(`${spreadsheet}/values/Q3%20Orders!1:1`)
			.query(true)
			.times(2)
			.reply(200, { values: [['order_id', 'status']] })
			.post(`${spreadsheet}/values/'Q3%20Orders':clear`)
			.reply(200, { clearedRange: "'Q3 Orders'!A1:Z1000" })
			.put(`${spreadsheet}/values/Q3%20Orders!1:1`)
			.query({ valueInputOption: 'RAW' })
			.reply(200, { updatedRange: "'Q3 Orders'!A1:B1", updatedRows: 1 })
			.post(`${spreadsheet}:batchUpdate`)
			.reply(200, { spreadsheetId: '1kZ8pQ4mV7xR2tN9wL3cH6bJ0sF5gD1aY8uE4iO7qW2M', replies: [{}] })
			.post(`${spreadsheet}:batchUpdate`)
			.reply(200, {
				spreadsheetId: '1kZ8pQ4mV7xR2tN9wL3cH6bJ0sF5gD1aY8uE4iO7qW2M',
				replies: [{ addSheet: { properties: { sheetId: 905317462, title: 'Q4 Orders' } } }],
			})
			.post(`${spreadsheet}:batchUpdate`)
			.reply(200, { spreadsheetId: '1kZ8pQ4mV7xR2tN9wL3cH6bJ0sF5gD1aY8uE4iO7qW2M', replies: [{}] })
			.post('/v4/spreadsheets')
			.reply(200, {
				spreadsheetId: '1Hq3nW6tR9yU2iO5pA8sD1fG4hJ7kL0zX3cV6bN9mQ2E',
				properties: { title: 'Q4 Planning' },
			});

		nock('https://www.googleapis.com')
			.delete('/drive/v3/files/1kZ8pQ4mV7xR2tN9wL3cH6bJ0sF5gD1aY8uE4iO7qW2M')
			.reply(204);
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
		workflowFiles: ['sheet.workflow.json'],
	});
});
