import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../v2/actions/sheet/delete.operation';
import type { GoogleSheet } from '../../../v2/helpers/GoogleSheet';

describe('Google Sheet - Delete', () => {
	let mockExecuteFunctions: Partial<IExecuteFunctions>;
	let mockSheet: Partial<GoogleSheet>;

	beforeEach(() => {
		mockExecuteFunctions = {
			getInputData: vi.fn().mockReturnValue([{ json: {} }]),
			getNodeParameter: vi.fn(),
			helpers: {
				constructExecutionMetaData: vi.fn((data) => ({ json: data })),
			},
		} as unknown as Partial<IExecuteFunctions>;

		mockSheet = {
			spreadsheetBatchUpdate: vi.fn(),
		} as Partial<GoogleSheet>;
	});

	test('should delete a single row', async () => {
		mockExecuteFunctions.getNodeParameter = vi.fn((param: string) => {
			if (param === 'toDelete') return 'rows';
			if (param === 'startIndex') return 2;
			if (param === 'numberToDelete') return 1;
			return null;
		}) as unknown as IExecuteFunctions['getNodeParameter'];

		await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);

		expect(mockSheet.spreadsheetBatchUpdate).toHaveBeenCalledWith([
			{
				deleteDimension: {
					range: {
						sheetId: 'Sheet1',
						dimension: 'ROWS',
						startIndex: 1, // Adjusted for zero-based index
						endIndex: 2,
					},
				},
			},
		]);
	});

	test('should delete multiple rows', async () => {
		mockExecuteFunctions.getNodeParameter = vi.fn((param: string) => {
			if (param === 'toDelete') return 'rows';
			if (param === 'startIndex') return 3;
			if (param === 'numberToDelete') return 2;
			return null;
		}) as unknown as IExecuteFunctions['getNodeParameter'];

		await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);

		expect(mockSheet.spreadsheetBatchUpdate).toHaveBeenCalledWith([
			{
				deleteDimension: {
					range: {
						sheetId: 'Sheet1',
						dimension: 'ROWS',
						startIndex: 2,
						endIndex: 4,
					},
				},
			},
		]);
	});

	test('should delete a single column', async () => {
		mockExecuteFunctions.getNodeParameter = vi.fn((param: string) => {
			if (param === 'toDelete') return 'columns';
			if (param === 'startIndex') return 'B';
			if (param === 'numberToDelete') return 1;
			return null;
		}) as unknown as IExecuteFunctions['getNodeParameter'];

		await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);

		expect(mockSheet.spreadsheetBatchUpdate).toHaveBeenCalledWith([
			{
				deleteDimension: {
					range: {
						sheetId: 'Sheet1',
						dimension: 'COLUMNS',
						startIndex: 1, // 'B' corresponds to index 1 (zero-based)
						endIndex: 2,
					},
				},
			},
		]);
	});

	test('should delete multiple columns', async () => {
		mockExecuteFunctions.getNodeParameter = vi.fn((param: string) => {
			if (param === 'toDelete') return 'columns';
			if (param === 'startIndex') return 'C';
			if (param === 'numberToDelete') return 3;
			return null;
		}) as unknown as IExecuteFunctions['getNodeParameter'];

		await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);

		expect(mockSheet.spreadsheetBatchUpdate).toHaveBeenCalledWith([
			{
				deleteDimension: {
					range: {
						sheetId: 'Sheet1',
						dimension: 'COLUMNS',
						startIndex: 2, // 'C' corresponds to index 2 (zero-based)
						endIndex: 5,
					},
				},
			},
		]);
	});

	test('should return wrapped success response', async () => {
		mockExecuteFunctions.getNodeParameter = vi.fn((param: string) => {
			if (param === 'toDelete') return 'rows';
			if (param === 'startIndex') return 2;
			if (param === 'numberToDelete') return 1;
			return null;
		}) as unknown as IExecuteFunctions['getNodeParameter'];
		mockExecuteFunctions.helpers = {
			constructExecutionMetaData: vi.fn((data) => data),
		} as unknown as IExecuteFunctions['helpers'];

		const result = await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);
		expect(result).toEqual([{ json: { success: true } }]);
	});
});
