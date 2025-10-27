import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { execute } from '../../../v2/actions/sheet/append.operation';
import type { GoogleSheet } from '../../../v2/helpers/GoogleSheet';

describe('Google Sheet - Append', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let mockGoogleSheet: MockProxy<GoogleSheet>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockGoogleSheet = mock<GoogleSheet>();
	});

	it('should insert input data if sheet is empty', async () => {
		const inputData = [
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
		];
		mockExecuteFunctions.getInputData.mockReturnValueOnce(inputData);

		mockExecuteFunctions.getNode.mockReturnValueOnce(mock<INode>({ typeVersion: 4.5 }));
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('USER_ENTERED') // valueInputMode
			.mockReturnValueOnce({}); // options
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('defineBelow'); // dataMode

		mockGoogleSheet.getData.mockResolvedValueOnce(undefined);
		mockGoogleSheet.getData.mockResolvedValueOnce(undefined);
		mockGoogleSheet.updateRows.mockResolvedValueOnce(undefined);

		mockGoogleSheet.updateRows.mockResolvedValueOnce([]);

		mockGoogleSheet.appendEmptyRowsOrColumns.mockResolvedValueOnce([]);
		mockGoogleSheet.appendSheetData.mockResolvedValueOnce([]);

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1', '1234');

		expect(mockGoogleSheet.updateRows).toHaveBeenCalledWith('Sheet1', [['name', 'text']], 'RAW', 1);
		expect(mockGoogleSheet.appendEmptyRowsOrColumns).toHaveBeenCalledWith('1234', 1, 0);
		expect(mockGoogleSheet.appendSheetData).toHaveBeenCalledWith({
			inputData: [{ name: 'NEW NAME', text: 'NEW TEXT' }],
			keyRowIndex: 1,
			lastRow: 2,
			range: 'Sheet1',
			valueInputMode: 'USER_ENTERED',
		});
		expect(inputData[0].json).toEqual({ row_number: 3, name: 'NEW NAME', text: 'NEW TEXT' });
	});
});
