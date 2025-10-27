import { mockDeep } from 'jest-mock-extended';
import nock from 'nock';

import { testPollingTriggerNode } from '@test/nodes/TriggerHelpers';

import { GoogleSheetsTrigger } from '../GoogleSheetsTrigger.node';

describe('GoogleSheetsTrigger', () => {
	const baseUrl = 'https://sheets.googleapis.com';

	describe('rowAdded event', () => {
		it('should return rows without header', async () => {
			const scope = nock(baseUrl);
			scope
				.get('/v4/spreadsheets/testDocumentId')
				.query({ fields: 'sheets.properties' })
				.reply(200, {
					sheets: [{ properties: { sheetId: 1, title: 'testSheetName' } }],
				});
			scope
				.get((uri) => uri.startsWith('/v4/spreadsheets/testDocumentId/values/testSheetName!A1:ZZZ'))
				.times(2)
				.reply(200, {
					values: [
						['name', 'count'],
						['apple', 14],
						['banana', 12],
					],
				});

			const { response } = await testPollingTriggerNode(GoogleSheetsTrigger, {
				credential: mockDeep(),
				mode: 'manual',
				node: {
					parameters: {
						documentId: 'testDocumentId',
						sheetName: 1,
						event: 'rowAdded',
						options: {
							dataLocationOnSheet: null,
						},
					},
				},
			});

			scope.done();

			expect(response).toEqual([
				[{ json: { count: 14, name: 'apple' } }, { json: { count: 12, name: 'banana' } }],
			]);
		});

		it('should return rows starting from first data row', async () => {
			const scope = nock(baseUrl);
			scope
				.get('/v4/spreadsheets/testDocumentId')
				.query({ fields: 'sheets.properties' })
				.reply(200, {
					sheets: [{ properties: { sheetId: 1, title: 'testSheetName' } }],
				});
			scope
				.get((uri) => uri.startsWith('/v4/spreadsheets/testDocumentId/values/testSheetName!A5:ZZZ'))
				.times(2)
				.reply(200, {
					values: [
						['name', 'count'],
						['apple', 14],
						['banana', 12],
						['orange', 10],
					],
				});

			const { response } = await testPollingTriggerNode(GoogleSheetsTrigger, {
				credential: mockDeep(),
				mode: 'manual',
				node: {
					parameters: {
						documentId: 'testDocumentId',
						sheetName: 1,
						event: 'rowAdded',
						options: {
							dataLocationOnSheet: {
								values: {
									rangeDefinition: 'specifyRange',
									headerRow: 5,
									firstDataRow: 7,
								},
							},
						},
					},
				},
			});

			scope.done();

			expect(response).toEqual([
				[{ json: { count: 12, name: 'banana' } }, { json: { count: 10, name: 'orange' } }],
			]);
		});

		it('should return rows starting from header row when first data row is less than header row', async () => {
			const scope = nock(baseUrl);
			scope
				.get('/v4/spreadsheets/testDocumentId')
				.query({ fields: 'sheets.properties' })
				.reply(200, {
					sheets: [{ properties: { sheetId: 1, title: 'testSheetName' } }],
				});
			scope
				.get((uri) => uri.startsWith('/v4/spreadsheets/testDocumentId/values/testSheetName!A5:ZZZ'))
				.times(2)
				.reply(200, {
					values: [
						['name', 'count'],
						['apple', 14],
						['banana', 12],
						['orange', 10],
					],
				});

			const { response } = await testPollingTriggerNode(GoogleSheetsTrigger, {
				credential: mockDeep(),
				mode: 'manual',
				node: {
					parameters: {
						documentId: 'testDocumentId',
						sheetName: 1,
						event: 'rowAdded',
						options: {
							dataLocationOnSheet: {
								values: {
									rangeDefinition: 'specifyRange',
									headerRow: 5,
									firstDataRow: 4,
								},
							},
						},
					},
				},
			});

			scope.done();

			expect(response).toEqual([
				[
					{ json: { count: 14, name: 'apple' } },
					{ json: { count: 12, name: 'banana' } },
					{ json: { count: 10, name: 'orange' } },
				],
			]);
		});

		it('should return rows starting from first data row in trigger mode', async () => {
			const scope = nock(baseUrl);
			scope
				.get('/v4/spreadsheets/testDocumentId')
				.query({ fields: 'sheets.properties' })
				.reply(200, {
					sheets: [{ properties: { sheetId: 1, title: 'testSheetName' } }],
				});
			scope
				.get((uri) => uri.startsWith('/v4/spreadsheets/testDocumentId/values/testSheetName!A5:ZZZ'))
				.times(2)
				.reply(200, {
					values: [
						['name', 'count'],
						['apple', 14],
						['banana', 12],
						['orange', 10],
					],
				});

			const { response } = await testPollingTriggerNode(GoogleSheetsTrigger, {
				credential: mockDeep(),
				mode: 'trigger',
				workflowStaticData: {
					documentId: 'testDocumentId',
					sheetId: 1,
					lastIndexChecked: 0,
				},
				node: {
					parameters: {
						documentId: 'testDocumentId',
						sheetName: 1,
						event: 'rowAdded',
						options: {
							dataLocationOnSheet: {
								values: {
									rangeDefinition: 'specifyRange',
									headerRow: 5,
									firstDataRow: 7,
								},
							},
						},
					},
				},
			});

			scope.done();

			expect(response).toEqual([
				[{ json: { count: 12, name: 'banana' } }, { json: { count: 10, name: 'orange' } }],
			]);
		});

		it('should return rows starting from header row when first data row is less than header row in trigger mode', async () => {
			const scope = nock(baseUrl);
			scope
				.get('/v4/spreadsheets/testDocumentId')
				.query({ fields: 'sheets.properties' })
				.reply(200, {
					sheets: [{ properties: { sheetId: 1, title: 'testSheetName' } }],
				});
			scope
				.get((uri) => uri.startsWith('/v4/spreadsheets/testDocumentId/values/testSheetName!A5:ZZZ'))
				.times(2)
				.reply(200, {
					values: [
						['name', 'count'],
						['apple', 14],
						['banana', 12],
						['orange', 10],
					],
				});

			const { response } = await testPollingTriggerNode(GoogleSheetsTrigger, {
				credential: mockDeep(),
				mode: 'trigger',
				workflowStaticData: {
					documentId: 'testDocumentId',
					sheetId: 1,
					lastIndexChecked: 0,
				},
				node: {
					parameters: {
						documentId: 'testDocumentId',
						sheetName: 1,
						event: 'rowAdded',
						options: {
							dataLocationOnSheet: {
								values: {
									rangeDefinition: 'specifyRange',
									headerRow: 5,
									firstDataRow: 4,
								},
							},
						},
					},
				},
			});

			scope.done();

			expect(response).toEqual([
				[
					{ json: { count: 14, name: 'apple' } },
					{ json: { count: 12, name: 'banana' } },
					{ json: { count: 10, name: 'orange' } },
				],
			]);
		});
	});
});
