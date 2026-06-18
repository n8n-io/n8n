import { mockDeep } from 'vitest-mock-extended';
import nock from 'nock';
import * as XLSX from 'xlsx';

import { testPollingTriggerNode } from '@test/nodes/TriggerHelpers';

import { GoogleSheetsTrigger } from '../GoogleSheetsTrigger.node';
import { getGoogleAccessToken } from '../../GenericFunctions';

// Mock only the service-account token mint so the service-account branch in the
// shared transport does not perform real JWT signing / token network calls.
// The OAuth2-fallback tests below never reach getGoogleAccessToken (they flow
// through the harness-stubbed requestOAuth2), so this mock leaves them intact.
vi.mock('../../GenericFunctions', () => ({
	getGoogleAccessToken: vi.fn().mockResolvedValue({ access_token: 'x' }),
}));

describe('GoogleSheetsTrigger', () => {
	const baseUrl = 'https://sheets.googleapis.com';

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.enableNetConnect();
	});

	beforeEach(() => {
		// Reset call history (keeps the resolved-value implementation) so per-test
		// assertions on getGoogleAccessToken only see the current test's calls.
		vi.mocked(getGoogleAccessToken).mockClear();
		vi.mocked(getGoogleAccessToken).mockResolvedValue({ access_token: 'x' });
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

			// Proves the rows were produced via the service-account auth path (not a
			// silent fall-through to OAuth2): the rowAdded Sheets-values calls mint a
			// token through getGoogleAccessToken with the narrower 'sheetV2' scope.
			expect(getGoogleAccessToken).toHaveBeenCalled();
			const rowAddedScopes = vi.mocked(getGoogleAccessToken).mock.calls.map((call) => call[1]);
			expect(rowAddedScopes).toContain('sheetV2');
			// rowAdded makes no Drive content-read calls, so it must never mint the
			// broader trigger scope (least privilege).
			expect(rowAddedScopes).not.toContain('sheetV2Trigger');

			expect(response).toEqual([
				[{ json: { count: 14, name: 'apple' } }, { json: { count: 12, name: 'banana' } }],
			]);
		});
	});

	describe('anyUpdate event', () => {
		const driveBaseUrl = 'https://www.googleapis.com';
		const exportHost = 'https://example.com';
		const previousExportPath = '/export/prev';
		const previousExportUrl = `${exportHost}${previousExportPath}`;

		// Build a real xlsx workbook for the previous revision so the real XLSX.read
		// inside sheetBinaryToArrayOfArrays parses a valid file. The sheet name must
		// match the title resolved from the spreadsheet metadata nock ('testSheetName').
		const buildPreviousRevisionBuffer = (rows: Array<Array<string | number>>) => {
			const worksheet = XLSX.utils.aoa_to_sheet(rows);
			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, 'testSheetName');
			return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
		};

		it('should diff revisions via service account authentication and forward per-call scopes', async () => {
			const sheetsScope = nock(baseUrl);
			// Spreadsheet metadata lookup (spreadsheetGetSheet) - sheetV2 scope
			sheetsScope
				.get('/v4/spreadsheets/testDocumentId')
				.query({ fields: 'sheets.properties' })
				.reply(200, {
					sheets: [{ properties: { sheetId: 1, title: 'testSheetName' } }],
				});
			// Current sheet values (googleSheet.getData on A:ZZZ) - sheetV2 scope
			sheetsScope
				.get((uri) => uri.startsWith('/v4/spreadsheets/testDocumentId/values/testSheetName!A:ZZZ'))
				.reply(200, {
					values: [
						['name', 'count'],
						['apple', 14],
						['banana', 99],
					],
				});

			const driveScope = nock(driveBaseUrl);
			// Revisions listing - sheetV2Trigger scope (needs drive.readonly so Google
			// returns exportLinks). id '2' > seeded lastRevision 1 so poll() proceeds,
			// storing the new revision link but downloading the previous one.
			driveScope
				.get('/drive/v3/files/testDocumentId/revisions')
				.query(true)
				.reply(200, {
					revisions: [
						{
							id: '2',
							exportLinks: {
								'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
									'https://example.com/export/current',
							},
						},
					],
				});

			// Previous-revision export download (getRevisionFile) - sheetV2Trigger scope.
			// Returns a real xlsx buffer so sheetBinaryToArrayOfArrays can parse it.
			const previousRevisionBuffer = buildPreviousRevisionBuffer([
				['name', 'count'],
				['apple', 14],
				['banana', 12],
			]);
			const exportScope = nock(exportHost);
			exportScope.get(previousExportPath).query(true).reply(200, previousRevisionBuffer, {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});

			const { response } = await testPollingTriggerNode(GoogleSheetsTrigger, {
				credential: mockDeep(),
				mode: 'trigger',
				workflowStaticData: {
					documentId: 'testDocumentId',
					sheetId: 1,
					lastRevision: 1,
					lastRevisionLink: previousExportUrl,
				},
				node: {
					parameters: {
						authentication: 'serviceAccount',
						documentId: 'testDocumentId',
						sheetName: 1,
						event: 'anyUpdate',
						// An explicit falsy value keeps poll() on the default range
						// (header row 1, data from row 2) without a data-location override.
						options: { dataLocationOnSheet: null },
					},
				},
			});

			sheetsScope.done();
			driveScope.done();
			exportScope.done();

			// (a) The diff reflects the only changed row (banana: 12 -> 99).
			expect(response).toEqual([
				[
					{
						json: {
							row_number: 3,
							change_type: 'updated',
							name: 'banana',
							count: 99,
						},
					},
				],
			]);

			// (b) Per-call least-privilege confinement: BOTH Drive content-read calls
			// (the revisions listing + the export download) mint with the broader
			// trigger scope, while the Sheets metadata + values calls stay on the
			// narrower sheetV2 scope. Asserting the COUNT (not mere membership) guards
			// the revisions-LIST call specifically: reverting only that call back to
			// sheetV2 would drop sheetV2Trigger to a single occurrence and fail here.
			const scopes = vi.mocked(getGoogleAccessToken).mock.calls.map((call) => call[1]);
			expect(scopes.filter((scope) => scope === 'sheetV2Trigger')).toHaveLength(2);
			expect(scopes.filter((scope) => scope === 'sheetV2')).toHaveLength(2);
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
