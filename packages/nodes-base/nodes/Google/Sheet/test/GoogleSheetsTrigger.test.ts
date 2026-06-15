import { mockDeep } from 'jest-mock-extended';
import nock from 'nock';

import { testPollingTriggerNode } from '@test/nodes/TriggerHelpers';

import { GoogleSheetsTrigger } from '../GoogleSheetsTrigger.node';

// Mock only the service-account token mint so the service-account branch in the
// shared transport does not perform real JWT signing / token network calls.
// The OAuth2-fallback tests below never reach getGoogleAccessToken (they flow
// through the harness-stubbed requestOAuth2), so this mock leaves them intact.
jest.mock('../../GenericFunctions', () => ({
	getGoogleAccessToken: jest.fn().mockResolvedValue({ access_token: 'x' }),
}));

describe('GoogleSheetsTrigger', () => {
	const baseUrl = 'https://sheets.googleapis.com';

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.enableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
	});

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

		it('should return rows when using service account authentication', async () => {
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
						authentication: 'serviceAccount',
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
	});

	describe('node description', () => {
		const description = new GoogleSheetsTrigger().description;

		it('should expose Service Account and OAuth2 authentication options', () => {
			const authentication = description.properties.find(
				(property) => property.name === 'authentication',
			);

			expect(authentication).toBeDefined();
			expect(authentication?.type).toBe('options');
			expect(authentication?.default).toBe('triggerOAuth2');
			expect(authentication?.options?.map((option) => 'value' in option && option.value)).toEqual([
				'serviceAccount',
				'triggerOAuth2',
			]);
		});

		it('should gate the googleApi credential behind the serviceAccount auth option', () => {
			const googleApi = description.credentials?.find(
				(credential) => credential.name === 'googleApi',
			);

			expect(googleApi).toBeDefined();
			expect(googleApi?.testedBy).toBe('googleApiCredentialTest');
			expect(googleApi?.displayOptions?.show?.authentication).toEqual(['serviceAccount']);
		});

		it('should gate the OAuth2 credential behind the triggerOAuth2 auth option', () => {
			const oauth2 = description.credentials?.find(
				(credential) => credential.name === 'googleSheetsTriggerOAuth2Api',
			);

			expect(oauth2).toBeDefined();
			expect(oauth2?.displayOptions?.show?.authentication).toEqual(['triggerOAuth2']);
		});

		it('should register the googleApi credential test method', () => {
			expect(
				new GoogleSheetsTrigger().methods.credentialTest.googleApiCredentialTest,
			).toBeDefined();
		});
	});
});
