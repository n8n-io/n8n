import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google Sheets V2 - read all sheets', () => {
	const credentials = {
		googleSheetsOAuth2Api: {
			scope: 'https://www.googleapis.com/auth/spreadsheets',
			oauthTokenData: {
				access_token: 'test-access-token',
			},
		},
	};

	beforeAll(() => {
		const mock = nock('https://sheets.googleapis.com');

		// The chart sheet must be skipped: the values API has no range to read for it
		mock
			.get('/v4/spreadsheets/spreadsheet-id')
			.query({ fields: 'sheets.properties' })
			.reply(200, {
				sheets: [
					{ properties: { sheetId: 0, title: 'Q1', sheetType: 'GRID' } },
					{ properties: { sheetId: 1, title: 'Revenue Chart', sheetType: 'OBJECT' } },
					{ properties: { sheetId: 2, title: 'Q2', sheetType: 'GRID' } },
				],
			})
			.persist();

		mock
			.get("/v4/spreadsheets/spreadsheet-id/values/'Q1'")
			.query(true)
			.reply(200, {
				range: 'Q1',
				values: [
					['name', 'amount'],
					['Ada', 10],
					['Grace', 20],
				],
			})
			.persist();

		mock
			.get("/v4/spreadsheets/spreadsheet-id/values/'Q2'")
			.query(true)
			.reply(200, {
				range: 'Q2',
				values: [
					['name', 'amount'],
					['Alan', 30],
				],
			})
			.persist();
	});

	afterAll(() => {
		nock.cleanAll();
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['read-all-sheets.workflow.json'],
	});
});
