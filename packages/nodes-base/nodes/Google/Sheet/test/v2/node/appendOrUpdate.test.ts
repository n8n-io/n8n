import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

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

	it('should throw error when no column names can be retrieved and sheet has data', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: { id: 1, name: 'Test' },
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 3 }));
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('USER_ENTERED') // options.cellFormat
			.mockReturnValueOnce({}) // options
			.mockReturnValueOnce('defineBelow') // dataMode
			.mockReturnValueOnce('id') // columnToMatchOn
			.mockReturnValueOnce('1') // valueToMatchOn
			.mockReturnValueOnce([{ column: 'name', fieldValue: 'Test Name' }]); // fieldsUi.values

		// Mock sheet with data but no header row at keyRowIndex
		mockGoogleSheet.getData.mockResolvedValueOnce([
			undefined as any, // No header row at keyRowIndex 0
			['some', 'data', 'here'], // Has data but not at header position
		]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);
		mockGoogleSheet.prepareDataForUpdateOrUpsert.mockResolvedValueOnce({
			updateData: [],
			appendData: [],
		});

		await expect(
			execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234'),
		).rejects.toThrow(NodeOperationError);
	});

	it('should handle custom header row and first data row positions', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: { id: 1, name: 'Test' },
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 3 }));
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('USER_ENTERED') // options.cellFormat
			.mockReturnValueOnce({
				locationDefine: {
					values: {
						headerRow: '3',
						firstDataRow: '5',
					},
				},
			}) // options with custom positions
			.mockReturnValueOnce('defineBelow') // dataMode
			.mockReturnValueOnce('id') // columnToMatchOn
			.mockReturnValueOnce('1') // valueToMatchOn
			.mockReturnValueOnce([{ column: 'name', fieldValue: 'Test Name' }]); // fieldsUi.values

		mockGoogleSheet.getData.mockResolvedValueOnce([
			[],
			[],
			['id', 'name'], // Header at row 3 (index 2)
			[],
			['1', 'Old Name'], // Data starts at row 5 (index 4)
		]);

		mockGoogleSheet.getColumnValues.mockResolvedValueOnce(['1']);
		mockGoogleSheet.prepareDataForUpdateOrUpsert.mockResolvedValueOnce({
			updateData: [],
			appendData: [{ id: '1', name: 'Test Name' }],
		});

		mockGoogleSheet.appendEmptyRowsOrColumns.mockResolvedValueOnce([]);
		mockGoogleSheet.appendSheetData.mockResolvedValueOnce([]);

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		expect(mockGoogleSheet.getColumnValues).toHaveBeenCalledWith({
			dataStartRowIndex: 4, // firstDataRow - 1
			keyIndex: 0,
			range: 'Sheet1!A:Z',
			sheetData: expect.any(Array),
			valueRenderMode: 'UNFORMATTED_VALUE',
		});
	});

	it('should handle data mode "nothing" by skipping processing', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{ json: { id: 1, name: 'Test' }, pairedItem: { item: 0, input: undefined } },
			{ json: { id: 2, name: 'Test2' }, pairedItem: { item: 1, input: undefined } },
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 3 }));
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('USER_ENTERED') // options.cellFormat
			.mockReturnValueOnce({}) // options
			.mockReturnValueOnce('nothing') // dataMode
			.mockReturnValueOnce('id'); // columnToMatchOn

		mockGoogleSheet.getData.mockResolvedValueOnce([['id', 'name']]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);
		mockGoogleSheet.prepareDataForUpdateOrUpsert.mockResolvedValueOnce({
			updateData: [],
			appendData: [],
		});

		const result = await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		// Should return original items since dataMode is 'nothing'
		expect(result).toEqual([
			{ json: { id: 1, name: 'Test' }, pairedItem: { item: 0 } },
			{ json: { id: 2, name: 'Test2' }, pairedItem: { item: 1 } },
		]);

		// Should not call update or append operations
		expect(mockGoogleSheet.batchUpdate).not.toHaveBeenCalled();
		expect(mockGoogleSheet.appendSheetData).not.toHaveBeenCalled();
	});

	it('should handle autoMapInputData with ignoreIt option', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: { id: 1, name: 'Test', extraField: 'should be ignored' },
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 3 }));
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('USER_ENTERED') // options.cellFormat
			.mockReturnValueOnce({ handlingExtraData: 'ignoreIt' }) // options
			.mockReturnValueOnce('autoMapInputData'); // dataMode

		mockGoogleSheet.getData.mockResolvedValueOnce([['id', 'name']]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);
		mockGoogleSheet.prepareDataForUpdateOrUpsert.mockResolvedValueOnce({
			updateData: [],
			appendData: [{ id: 1, name: 'Test', extraField: 'should be ignored' }],
		});

		mockGoogleSheet.appendEmptyRowsOrColumns.mockResolvedValueOnce([]);
		mockGoogleSheet.appendSheetData.mockResolvedValueOnce([]);

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		expect(mockGoogleSheet.prepareDataForUpdateOrUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				inputData: [{ id: 1, name: 'Test', extraField: 'should be ignored' }],
			}),
		);
	});

	it('should handle autoMapInputData with error option and throw on unexpected fields', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: { id: 1, name: 'Test', unexpectedField: 'error' },
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 3 }));
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('USER_ENTERED') // options.cellFormat
			.mockReturnValueOnce({ handlingExtraData: 'error' }) // options
			.mockReturnValueOnce('autoMapInputData'); // dataMode

		mockGoogleSheet.getData.mockResolvedValueOnce([['id', 'name']]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);

		await expect(
			execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234'),
		).rejects.toThrow(NodeOperationError);
	});

	it('should handle autoMapInputData with insertInNewColumn option', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: { id: 1, name: 'Test', newField: 'new column value' },
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 3 }));
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('USER_ENTERED') // options.cellFormat
			.mockReturnValueOnce({ handlingExtraData: 'insertInNewColumn' }) // options
			.mockReturnValueOnce('autoMapInputData'); // dataMode

		mockGoogleSheet.getData.mockResolvedValueOnce([['id', 'name']]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);
		mockGoogleSheet.updateRows.mockResolvedValueOnce([]);
		mockGoogleSheet.prepareDataForUpdateOrUpsert.mockResolvedValueOnce({
			updateData: [],
			appendData: [{ id: 1, name: 'Test', newField: 'new column value' }],
		});

		mockGoogleSheet.appendEmptyRowsOrColumns.mockResolvedValueOnce([]);
		mockGoogleSheet.appendSheetData.mockResolvedValueOnce([]);

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		// Should update header row with new column
		expect(mockGoogleSheet.updateRows).toHaveBeenCalledWith(
			'Sheet1',
			[['id', 'name', 'newField']],
			'RAW',
			1,
		);
	});

	it('should throw error when valueToMatchOn is empty in defineBelow mode (v3)', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: { id: 1, name: 'Test' },
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 3 }));
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('USER_ENTERED') // options.cellFormat
			.mockReturnValueOnce({}) // options
			.mockReturnValueOnce('defineBelow') // dataMode
			.mockReturnValueOnce('id') // columnToMatchOn
			.mockReturnValueOnce(''); // empty valueToMatchOn

		mockGoogleSheet.getData.mockResolvedValueOnce([['id', 'name']]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);

		await expect(
			execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234'),
		).rejects.toThrow(NodeOperationError);
	});

	it('should throw error when no values are provided in defineBelow mode (v3)', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: { id: 1, name: 'Test' },
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 3 }));
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('USER_ENTERED') // options.cellFormat
			.mockReturnValueOnce({}) // options
			.mockReturnValueOnce('defineBelow') // dataMode
			.mockReturnValueOnce('id') // columnToMatchOn
			.mockReturnValueOnce('1') // valueToMatchOn
			.mockReturnValueOnce([]); // empty fieldsUi.values

		mockGoogleSheet.getData.mockResolvedValueOnce([['id', 'name']]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);

		await expect(
			execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234'),
		).rejects.toThrow(NodeOperationError);
	});

	it('should handle newColumn type in defineBelow mode (v3)', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: { id: 1, name: 'Test' },
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 3 }));
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('USER_ENTERED') // options.cellFormat
			.mockReturnValueOnce({}) // options
			.mockReturnValueOnce('defineBelow') // dataMode
			.mockReturnValueOnce('id') // columnToMatchOn
			.mockReturnValueOnce('1') // valueToMatchOn
			.mockReturnValueOnce([
				{ column: 'name', fieldValue: 'Updated Name' },
				{ column: 'newColumn', columnName: 'description', fieldValue: 'New Description' },
			]); // fieldsUi.values with new column

		mockGoogleSheet.getData.mockResolvedValueOnce([['id', 'name']]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);
		mockGoogleSheet.updateRows.mockResolvedValueOnce([]);
		mockGoogleSheet.prepareDataForUpdateOrUpsert.mockResolvedValueOnce({
			updateData: [],
			appendData: [{ id: '1', name: 'Updated Name', description: 'New Description' }],
		});

		mockGoogleSheet.appendEmptyRowsOrColumns.mockResolvedValueOnce([]);
		mockGoogleSheet.appendSheetData.mockResolvedValueOnce([]);

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		// Should update header with new column
		expect(mockGoogleSheet.updateRows).toHaveBeenCalledWith(
			'Sheet1',
			[['id', 'name', 'description']],
			'RAW',
			1,
		);
	});

	it('should handle both update and append data', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: { id: 1, name: 'Test' },
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 4.5 }));
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName, _itemIndex, fallback) => {
			const params: Record<string, any> = {
				'options.cellFormat': 'USER_ENTERED',
				options: {},
				'columns.mappingMode': 'defineBelow',
				'columns.schema': [],
				'columns.matchingColumns': ['id'],
				'columns.value': { id: 1, name: 'Updated Name' },
				'columns.value[id]': 1,
			};
			return params[paramName] ?? fallback;
		});

		mockGoogleSheet.getData.mockResolvedValueOnce([['id', 'name']]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce(['1']);
		mockGoogleSheet.prepareDataForUpdateOrUpsert.mockResolvedValueOnce({
			updateData: [{ range: 'A2:B2', values: [['1', 'Updated Name']] }],
			appendData: [{ id: 2, name: 'New Item' }],
		});

		mockGoogleSheet.batchUpdate.mockResolvedValueOnce([]);
		mockGoogleSheet.appendEmptyRowsOrColumns.mockResolvedValueOnce([]);
		mockGoogleSheet.appendSheetData.mockResolvedValueOnce([]);

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		expect(mockGoogleSheet.batchUpdate).toHaveBeenCalledWith(
			[{ range: 'A2:B2', values: [['1', 'Updated Name']] }],
			'USER_ENTERED',
		);
		expect(mockGoogleSheet.appendSheetData).toHaveBeenCalled();
	});

	it('should use useAppend option when appending data', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: { id: 1, name: 'Test' },
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 4.5 }));
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName, _itemIndex, fallback) => {
			const params: Record<string, any> = {
				'options.cellFormat': 'USER_ENTERED',
				options: { useAppend: true },
				'columns.mappingMode': 'defineBelow',
				'columns.schema': [],
				'columns.matchingColumns': ['id'],
				'columns.value': { id: 1, name: 'Test Name' },
				'columns.value[id]': 1,
			};
			return params[paramName] ?? fallback;
		});

		mockGoogleSheet.getData.mockResolvedValueOnce([['id', 'name']]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);
		mockGoogleSheet.prepareDataForUpdateOrUpsert.mockResolvedValueOnce({
			updateData: [],
			appendData: [{ id: 1, name: 'Test Name' }],
		});

		mockGoogleSheet.appendSheetData.mockResolvedValueOnce([]);

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		expect(mockGoogleSheet.appendSheetData).toHaveBeenCalledWith({
			columnNamesList: [['id', 'name']],
			inputData: [{ id: 1, name: 'Test Name' }],
			keyRowIndex: 1,
			lastRow: 2,
			range: 'Sheet1!A:Z',
			useAppend: true,
			valueInputMode: 'USER_ENTERED',
		});

		// Should NOT call appendEmptyRowsOrColumns when useAppend is true
		expect(mockGoogleSheet.appendEmptyRowsOrColumns).not.toHaveBeenCalled();
	});

	it('should handle v4 with empty columns.value and throw error', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: { id: 1, name: 'Test' },
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 4.5 }));
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName, _itemIndex, fallback) => {
			const params: Record<string, any> = {
				'options.cellFormat': 'USER_ENTERED',
				options: {},
				'columns.mappingMode': 'defineBelow',
				'columns.schema': [],
				'columns.matchingColumns': ['id'],
				'columns.value': {},
			};
			return params[paramName] ?? fallback;
		});

		mockGoogleSheet.getData.mockResolvedValueOnce([['id', 'name']]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);

		await expect(
			execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234'),
		).rejects.toThrow(NodeOperationError);
	});

	it('should handle v4 with null/undefined values by converting to empty string', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: { id: 1, name: 'Test' },
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 4.5 }));
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName, _itemIndex, fallback) => {
			const params: Record<string, any> = {
				'options.cellFormat': 'USER_ENTERED',
				options: {},
				'columns.mappingMode': 'defineBelow',
				'columns.schema': [],
				'columns.matchingColumns': ['id'],
				'columns.value': { id: 1, name: null, description: undefined },
				'columns.value[id]': 1,
			};
			return params[paramName] ?? fallback;
		});

		mockGoogleSheet.getData.mockResolvedValueOnce([['id', 'name', 'description']]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);
		mockGoogleSheet.prepareDataForUpdateOrUpsert.mockResolvedValueOnce({
			updateData: [],
			appendData: [{ id: 1, name: '', description: '' }],
		});

		mockGoogleSheet.appendEmptyRowsOrColumns.mockResolvedValueOnce([]);
		mockGoogleSheet.appendSheetData.mockResolvedValueOnce([]);

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		expect(mockGoogleSheet.prepareDataForUpdateOrUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				inputData: [{ id: 1, name: '', description: '' }],
			}),
		);
	});

	it('should return mapped values for v4+ in defineBelow mode', async () => {
		const mappedValues = [
			{ id: 1, name: 'Test Name' },
			{ id: 2, name: 'Another Test' },
		];

		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{ json: { id: 1 }, pairedItem: { item: 0, input: undefined } },
			{ json: { id: 2 }, pairedItem: { item: 1, input: undefined } },
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 4.5 }));
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName, itemIndex, fallback) => {
			const params: Record<string, any> = {
				'options.cellFormat': 'USER_ENTERED',
				options: {},
				'columns.mappingMode': 'defineBelow',
				'columns.schema': [],
				'columns.matchingColumns': ['id'],
				'columns.value[id]': itemIndex === 0 ? 1 : 2,
			};

			// Handle per-item columns.value calls
			if (paramName === 'columns.value' && typeof itemIndex === 'number') {
				return mappedValues[itemIndex];
			}

			return params[paramName] ?? fallback;
		});

		mockGoogleSheet.getData.mockResolvedValueOnce([['id', 'name']]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);

		// Mock prepareDataForUpdateOrUpsert to be called for each item
		mockGoogleSheet.prepareDataForUpdateOrUpsert
			.mockResolvedValueOnce({
				updateData: [],
				appendData: [mappedValues[0]],
			})
			.mockResolvedValueOnce({
				updateData: [],
				appendData: [mappedValues[1]],
			});

		mockGoogleSheet.appendEmptyRowsOrColumns.mockResolvedValueOnce([]);
		mockGoogleSheet.appendSheetData.mockResolvedValueOnce([]);

		const result = await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		expect(result).toEqual([
			{ json: mappedValues[0], pairedItem: { item: 0 } },
			{ json: mappedValues[1], pairedItem: { item: 1 } },
		]);
	});

	it('should handle custom valueRenderMode option', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: { id: 1, name: 'Test' },
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 4.5 }));
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName, _itemIndex, fallback) => {
			const params: Record<string, any> = {
				'options.cellFormat': 'USER_ENTERED',
				options: { valueRenderMode: 'FORMATTED_VALUE' },
				'columns.mappingMode': 'defineBelow',
				'columns.schema': [],
				'columns.matchingColumns': ['id'],
				'columns.value': { id: 1, name: 'Test Name' },
				'columns.value[id]': 1,
			};
			return params[paramName] ?? fallback;
		});

		mockGoogleSheet.getData.mockResolvedValueOnce([['id', 'name']]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);
		mockGoogleSheet.prepareDataForUpdateOrUpsert.mockResolvedValueOnce({
			updateData: [],
			appendData: [{ id: 1, name: 'Test Name' }],
		});

		mockGoogleSheet.appendEmptyRowsOrColumns.mockResolvedValueOnce([]);
		mockGoogleSheet.appendSheetData.mockResolvedValueOnce([]);

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		expect(mockGoogleSheet.getColumnValues).toHaveBeenCalledWith(
			expect.objectContaining({
				valueRenderMode: 'FORMATTED_VALUE',
			}),
		);

		expect(mockGoogleSheet.prepareDataForUpdateOrUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				valueRenderMode: 'FORMATTED_VALUE',
			}),
		);
	});

	it('should call checkForSchemaChanges for node version >= 4.4', async () => {
		const mockSchema = [
			{ id: 'id', displayName: 'ID' },
			{ id: 'name', displayName: 'Name' },
		];
		const mockNode = mock<INode>({ typeVersion: 4.5 });

		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: { id: 1, name: 'Test' },
				pairedItem: { item: 0, input: undefined },
			},
		]);

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName, _itemIndex, fallback) => {
			const params: Record<string, any> = {
				'options.cellFormat': 'USER_ENTERED',
				options: {},
				'columns.mappingMode': 'defineBelow',
				'columns.schema': mockSchema,
				'columns.matchingColumns': ['id'],
				'columns.value': { id: 1, name: 'Test Name' },
				'columns.value[id]': 1,
			};
			return params[paramName] ?? fallback;
		});

		mockGoogleSheet.getData.mockResolvedValueOnce([['id', 'name']]);
		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);
		mockGoogleSheet.prepareDataForUpdateOrUpsert.mockResolvedValueOnce({
			updateData: [],
			appendData: [{ id: 1, name: 'Test Name' }],
		});

		mockGoogleSheet.appendEmptyRowsOrColumns.mockResolvedValueOnce([]);
		mockGoogleSheet.appendSheetData.mockResolvedValueOnce([]);

		// Mock the checkForSchemaChanges import to verify it's called
		const GoogleSheetsUtils = await import('../../../v2/helpers/GoogleSheets.utils');
		jest.spyOn(GoogleSheetsUtils, 'checkForSchemaChanges').mockImplementation(() => {});

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		expect(GoogleSheetsUtils.checkForSchemaChanges).toHaveBeenCalledWith(
			mockNode, // node
			['id', 'name'], // columnNames
			mockSchema, // schema
		);
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
			const params: Record<string, any> = {
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
			const params: Record<string, any> = {
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
