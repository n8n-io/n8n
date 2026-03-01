import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../v2/actions/sheet/clear.operation';
import type { GoogleSheet } from '../../../v2/helpers/GoogleSheet';

describe('Google Sheet - Clear', () => {
	let mockExecuteFunctions: Partial<IExecuteFunctions>;
	let mockSheet: Partial<GoogleSheet>;

	beforeEach(() => {
		mockExecuteFunctions = {
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNodeParameter: jest.fn(),
		} as Partial<IExecuteFunctions>;

		mockSheet = {
			clearData: jest.fn(),
			getData: jest.fn().mockResolvedValue([['Header1', 'Header2']]), // Mock first-row data
			updateRows: jest.fn(),
		} as Partial<GoogleSheet>;
	});

	test('should clear the whole sheet', async () => {
		mockExecuteFunctions.getNodeParameter = jest.fn((param: string) => {
			if (param === 'clear') return 'wholeSheet';
			return false;
		}) as unknown as IExecuteFunctions['getNodeParameter'];

		await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);

		expect(mockSheet.clearData).toHaveBeenCalledWith('Sheet1');
	});

	test('should clear specific rows', async () => {
		mockExecuteFunctions.getNodeParameter = jest.fn((param: string) => {
			if (param === 'clear') return 'specificRows';
			if (param === 'startIndex') return 2;
			if (param === 'rowsToDelete') return 3;
			return false;
		}) as unknown as IExecuteFunctions['getNodeParameter'];

		await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);

		expect(mockSheet.clearData).toHaveBeenCalledWith('Sheet1!2:4');
	});

	test('should clear specific columns', async () => {
		mockExecuteFunctions.getNodeParameter = jest.fn((param: string) => {
			if (param === 'clear') return 'specificColumns';
			if (param === 'startIndex') return 'B';
			if (param === 'columnsToDelete') return 2;
			return false;
		}) as unknown as IExecuteFunctions['getNodeParameter'];

		await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);

		expect(mockSheet.clearData).toHaveBeenCalledWith('Sheet1!B:C');
	});

	test('should clear a specific range', async () => {
		mockExecuteFunctions.getNodeParameter = jest.fn((param: string) => {
			if (param === 'clear') return 'specificRange';
			if (param === 'range') return 'A1:C5';
			return false;
		}) as unknown as IExecuteFunctions['getNodeParameter'];

		await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);

		expect(mockSheet.clearData).toHaveBeenCalledWith('Sheet1!A1:C5');
	});

	test('should keep the first row when clearing the whole sheet', async () => {
		mockExecuteFunctions.getNodeParameter = jest.fn((param: string) => {
			if (param === 'clear') return 'wholeSheet';
			if (param === 'keepFirstRow') return true;
			return false;
		}) as unknown as IExecuteFunctions['getNodeParameter'];

		await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			mockSheet as GoogleSheet,
			'Sheet1',
		);

		expect(mockSheet.getData).toHaveBeenCalledWith('Sheet1!1:1', 'FORMATTED_VALUE');
		expect(mockSheet.clearData).toHaveBeenCalledWith('Sheet1');
		expect(mockSheet.updateRows).toHaveBeenCalledWith('Sheet1', [['Header1', 'Header2']], 'RAW', 1);
	});
});
