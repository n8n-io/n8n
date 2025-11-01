import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { execute } from '../../../v2/actions/sheet/appendOrUpdate.operation';
import type { GoogleSheet } from '../../../v2/helpers/GoogleSheet';

describe('Google Sheet - Append or Update', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let mockGoogleSheet: MockProxy<GoogleSheet>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockGoogleSheet = mock<GoogleSheet>();
	});

	it('should insert input data if sheet is empty', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: {
					row_number: 3,
					name: 'NEW NAME',
					text: 'NEW TEXT',
				},
				pairedItem: {
					item: 0,
					input: undefined,
				},
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValueOnce(mock<INode>({ typeVersion: 4.5 }));
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('USER_ENTERED') // valueInputMode
			.mockReturnValueOnce({}); // options
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('defineBelow'); // dataMode
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce([]); // columns.schema
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(['row_number']); // columnsToMatchOn
		mockExecuteFunctions.getNode.mockReturnValueOnce(mock<INode>());
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce([]); // columns.matchingColumns

		mockGoogleSheet.getData.mockResolvedValueOnce(undefined);

		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);
		mockGoogleSheet.updateRows.mockResolvedValueOnce([]);

		mockGoogleSheet.prepareDataForUpdateOrUpsert.mockResolvedValueOnce({
			updateData: [],
			appendData: [
				{
					row_number: 3,
					name: 'NEW NAME',
					text: 'NEW TEXT',
				},
			],
		});

		mockGoogleSheet.appendEmptyRowsOrColumns.mockResolvedValueOnce([]);
		mockGoogleSheet.appendSheetData.mockResolvedValueOnce([]);

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		expect(mockGoogleSheet.getColumnValues).toHaveBeenCalledWith({
			dataStartRowIndex: 1,
			keyIndex: -1,
			range: 'Sheet1!A:Z',
			sheetData: [['name', 'text']],
			valueRenderMode: 'UNFORMATTED_VALUE',
		});

		expect(mockGoogleSheet.updateRows).toHaveBeenCalledWith(
			'Sheet1',
			[['name', 'text']],
			'USER_ENTERED',
			1,
		);
		expect(mockGoogleSheet.prepareDataForUpdateOrUpsert).toHaveBeenCalledWith({
			columnNamesList: [['name', 'text']],
			columnValuesList: [],
			dataStartRowIndex: 1,
			indexKey: 'row_number',
			inputData: [{ name: 'NEW NAME', row_number: 3, text: 'NEW TEXT' }],
			keyRowIndex: 0,
			range: 'Sheet1!A:Z',
			upsert: true,
			valueRenderMode: 'UNFORMATTED_VALUE',
		});
		expect(mockGoogleSheet.appendEmptyRowsOrColumns).toHaveBeenCalledWith('1234', 1, 0);
		expect(mockGoogleSheet.appendSheetData).toHaveBeenCalledWith({
			columnNamesList: [['name', 'text']],
			inputData: [{ name: 'NEW NAME', row_number: 3, text: 'NEW TEXT' }],
			keyRowIndex: 1,
			lastRow: 2,
			range: 'Sheet1!A:Z',
			valueInputMode: 'USER_ENTERED',
		});
	});
});

describe('Google Sheet - Append or Update v4.6 vs v4.7 Behavior', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let mockGoogleSheet: MockProxy<GoogleSheet>;

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('v4.6: empty string in UI gets filtered out, field not sent to backend', async () => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockGoogleSheet = mock<GoogleSheet>();

		mockExecuteFunctions.getNode
			.mockReturnValueOnce(mock<INode>({ typeVersion: 4.6 }))
			.mockReturnValueOnce(mock<INode>({ typeVersion: 4.6 }));

		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: {},
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
			const params: { [key: string]: any } = {
				'options.cellFormat': 'USER_ENTERED',
				options: {},
				'columns.mappingMode': 'defineBelow',
				'columns.schema': [],
				'columns.matchingColumns': ['id'],
				'columns.value': {
					id: 1,
					name: 'John',
					// email field is NOT present here because user typed '' in UI
					// and v4.6 frontend filtered it out (allowEmptyValues: false)
				},
			};
			return params[parameterName];
		});

		mockGoogleSheet.getData.mockResolvedValueOnce([
			['id', 'name', 'email'],
			['1', 'Old Name', 'old@email.com'],
		]);

		mockGoogleSheet.getColumnValues.mockResolvedValueOnce(['1']);
		mockGoogleSheet.updateRows.mockResolvedValueOnce([]);

		mockGoogleSheet.prepareDataForUpdateOrUpsert.mockResolvedValueOnce({
			updateData: [],
			appendData: [
				{
					id: 1,
					name: 'John',
					// email is not included, so it keeps old value
				},
			],
		});

		mockGoogleSheet.appendEmptyRowsOrColumns.mockResolvedValueOnce([]);
		mockGoogleSheet.appendSheetData.mockResolvedValueOnce([]);

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		// v4.6: Only fields with non-empty values are sent to prepareDataForUpdateOrUpsert
		expect(mockGoogleSheet.prepareDataForUpdateOrUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				inputData: [
					{
						id: 1,
						name: 'John',
						// email is NOT in the inputData, so cell keeps old value
					},
				],
			}),
		);
	});

	it('v4.7: empty string in UI is preserved and sent to backend to clear cell', async () => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockGoogleSheet = mock<GoogleSheet>();

		mockExecuteFunctions.getNode
			.mockReturnValueOnce(mock<INode>({ typeVersion: 4.7 }))
			.mockReturnValueOnce(mock<INode>({ typeVersion: 4.7 }));

		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: {},
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
			const params: { [key: string]: any } = {
				'options.cellFormat': 'USER_ENTERED',
				options: {},
				'columns.mappingMode': 'defineBelow',
				'columns.schema': [],
				'columns.matchingColumns': ['id'],
				'columns.value': {
					id: 1,
					name: 'John',
					email: '', // Empty string is preserved in v4.7 (allowEmptyValues: true)
				},
			};
			return params[parameterName];
		});

		mockGoogleSheet.getData.mockResolvedValueOnce([
			['id', 'name', 'email'],
			['1', 'Old Name', 'old@email.com'],
		]);

		mockGoogleSheet.getColumnValues.mockResolvedValueOnce(['1']);
		mockGoogleSheet.updateRows.mockResolvedValueOnce([]);

		mockGoogleSheet.prepareDataForUpdateOrUpsert.mockResolvedValueOnce({
			updateData: [],
			appendData: [
				{
					id: 1,
					name: 'John',
					email: '', // Empty string will clear the cell
				},
			],
		});

		mockGoogleSheet.appendEmptyRowsOrColumns.mockResolvedValueOnce([]);
		mockGoogleSheet.appendSheetData.mockResolvedValueOnce([]);

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		// v4.7: Empty strings are preserved and sent to prepareDataForUpdateOrUpsert
		expect(mockGoogleSheet.prepareDataForUpdateOrUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				inputData: [
					{
						id: 1,
						name: 'John',
						email: '', // Empty string is preserved and will clear the cell
					},
				],
			}),
		);
	});
});
