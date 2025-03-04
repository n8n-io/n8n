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

		mockExecuteFunctions.getNode.mockReturnValueOnce(mock<INode>({ typeVersion: 4.5 }));

		mockGoogleSheet.batchUpdate.mockResolvedValueOnce([]);
	});

	afterEach(() => {
		jest.resetAllMocks();
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

	it('should update rows by column values with special character', async () => {
		mockExecuteFunctions.getInputData.mockReturnValueOnce([
			{
				json: {
					row_number: 3,
					name: '** δ$% " []',
					text: 'δ$% " []',
				},
				pairedItem: {
					item: 0,
					input: undefined,
				},
			},
		]);

		mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
			const params: { [key: string]: string | object } = {
				options: {},
				'options.cellFormat': 'USER_ENTERED',
				'columns.matchingColumns': ['row_number'],
				'columns.value': {
					'ha []': 'kayyyy$',
					macarena: 'baile',
					'Real.1': 't&c',
					'21 "': 'Σ',
				},
				dataMode: 'autoMapInputData',
			};
			return params[parameterName];
		});

		mockGoogleSheet.getData.mockResolvedValueOnce([
			['Real.1', '21 "', 'dfd', 'ha []', 'macarena'],
			['aye.2', '"book"', 'ee', 'dd', 'dance'],
			['t&c', 'Σ', 'baz', 'kayyyy$', 'baile'],
			['fudge.2', '9080', 'live', 'dog', 'brazil'],
		]);

		mockGoogleSheet.getColumnValues.mockResolvedValueOnce([]);

		mockGoogleSheet.prepareDataForUpdatingByRowNumber.mockReturnValueOnce({
			updateData: [
				{
					range: 'Sheet1!B3',
					values: [['** δ$% " []']],
				},
				{
					range: 'Sheet1!C3',
					values: [['δ$% " []']],
				},
			],
		});

		await execute.call(mockExecuteFunctions, mockGoogleSheet, 'Sheet1');

		expect(mockGoogleSheet.getData).toHaveBeenCalledWith('Sheet1', 'FORMATTED_VALUE');

		expect(mockGoogleSheet.getColumnValues).toHaveBeenCalledWith({
			range: 'Sheet1!A:Z',
			keyIndex: -1,
			dataStartRowIndex: 1,
			valueRenderMode: 'UNFORMATTED_VALUE',
			sheetData: [
				['Real.1', '21 "', 'dfd', 'ha []', 'macarena'],
				['aye.2', '"book"', 'ee', 'dd', 'dance'],
				['t&c', 'Σ', 'baz', 'kayyyy$', 'baile'],
				['fudge.2', '9080', 'live', 'dog', 'brazil'],
			],
		});

		expect(mockGoogleSheet.prepareDataForUpdatingByRowNumber).toHaveBeenCalledWith(
			[
				{
					'21 "': 'Σ',
					'Real.1': 't&c',
					'ha []': 'kayyyy$',
					macarena: 'baile',
				},
			],
			'Sheet1!A:Z',
			[['Real.1', '21 "', 'dfd', 'ha []', 'macarena']],
		);

		expect(mockGoogleSheet.batchUpdate).toHaveBeenCalledWith(
			[
				{
					range: 'Sheet1!B3',
					values: [['** δ$% " []']],
				},
				{
					range: 'Sheet1!C3',
					values: [['δ$% " []']],
				},
			],
			'USER_ENTERED',
		);
	});
});
