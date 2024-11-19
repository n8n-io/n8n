import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { execute } from '../../../v2/actions/sheet/update.operation';
import type { GoogleSheet } from '../../../v2/helpers/GoogleSheet';

describe('Google Sheet - Update', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let mockGoogleSheet: MockProxy<GoogleSheet>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockGoogleSheet = mock<GoogleSheet>();
	});

	it('should update by row_number and not insert it as a new column', async () => {
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
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(['row_number']); // columnsToMatchOn
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('autoMapInputData'); // dataMode

		mockGoogleSheet.getData.mockResolvedValueOnce([
			['id', 'name', 'text'],
			['1', 'a', 'a'],
			['2', 'x', 'x'],
			['3', 'b', 'b'],
		]);

		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);

		mockGoogleSheet.prepareDataForUpdatingByRowNumber.mockReturnValueOnce({
			updateData: [
				{
					range: 'Sheet1!B3',
					values: [['NEW NAME']],
				},
				{
					range: 'Sheet1!C3',
					values: [['NEW TEXT']],
				},
			],
		});

		mockGoogleSheet.batchUpdate.mockResolvedValueOnce([]);

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1');

		expect(mockGoogleSheet.getData).toHaveBeenCalledWith('Sheet1', 'FORMATTED_VALUE');
		expect(mockGoogleSheet.getColumnValues).toHaveBeenCalledWith({
			range: 'Sheet1!A:Z',
			keyIndex: -1,
			dataStartRowIndex: 1,
			valueRenderMode: 'UNFORMATTED_VALUE',
			sheetData: [
				['id', 'name', 'text'],
				['1', 'a', 'a'],
				['2', 'x', 'x'],
				['3', 'b', 'b'],
			],
		});
		expect(mockGoogleSheet.prepareDataForUpdatingByRowNumber).toHaveBeenCalledWith(
			[
				{
					row_number: 3,
					name: 'NEW NAME',
					text: 'NEW TEXT',
				},
			],
			'Sheet1!A:Z',
			[['id', 'name', 'text']],
		);

		expect(mockGoogleSheet.batchUpdate).toHaveBeenCalledWith(
			[
				{
					range: 'Sheet1!B3',
					values: [['NEW NAME']],
				},
				{
					range: 'Sheet1!C3',
					values: [['NEW TEXT']],
				},
			],
			'USER_ENTERED',
		);
	});
});
