import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/sheet/append.operation';
import type { GoogleSheet } from '../../../../v2/helpers/GoogleSheet';
import * as GoogleSheetsUtils from '../../../../v2/helpers/GoogleSheets.utils';

jest.mock('../../../../v2/helpers/GoogleSheets.utils', () => ({
	autoMapInputData: jest.fn(),
	mapFields: jest.fn(),
	checkForSchemaChanges: jest.fn(),
	cellFormatDefault: jest.fn(),
}));

describe('Google Sheets Append Operation', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockSheet: jest.Mocked<GoogleSheet>;
	let mockNode: jest.Mocked<INode>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = mockDeep<IExecuteFunctions>();

		mockNode = mock<INode>({
			id: 'test-node',
			name: 'Google Sheets Append',
			type: 'n8n-nodes-base.googleSheets',
			typeVersion: 3,
			position: [0, 0],
			parameters: {},
		});

		mockSheet = mock<GoogleSheet>();
		mockSheet.getData = jest.fn();
		mockSheet.appendSheetData = jest.fn();
		mockSheet.appendEmptyRowsOrColumns = jest.fn();

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getInputData.mockReturnValue([
			{ json: { name: 'John', email: 'john@example.com' } },
			{ json: { name: 'Jane', email: 'jane@example.com' } },
		]);
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			const mockParams: Record<string, any> = {
				dataMode: 'defineBelow',
				'columns.mappingMode': 'defineBelow',
				options: {},
				'columns.schema': [],
			};
			return mockParams[paramName];
		});

		(GoogleSheetsUtils.autoMapInputData as jest.Mock).mockResolvedValue([
			{ name: 'John', email: 'john@example.com' },
			{ name: 'Jane', email: 'jane@example.com' },
		]);
		(GoogleSheetsUtils.mapFields as jest.Mock).mockReturnValue([
			{ name: 'John', email: 'john@example.com' },
			{ name: 'Jane', email: 'jane@example.com' },
		]);
		(GoogleSheetsUtils.cellFormatDefault as jest.Mock).mockReturnValue('USER_ENTERED');
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('Basic Execution', () => {
		it('should execute successfully with valid parameters', async () => {
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			const result = await execute.call(
				mockExecuteFunctions,
				mockSheet,
				'Sheet1!A1:B2',
				'sheet123',
			);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				json: { name: 'John', email: 'john@example.com' },
				pairedItem: { item: 0 },
			});
			expect(result[1]).toEqual({
				json: { name: 'Jane', email: 'jane@example.com' },
				pairedItem: { item: 1 },
			});
			expect(mockSheet.appendSheetData).toHaveBeenCalledWith({
				inputData: [
					{ name: 'John', email: 'john@example.com' },
					{ name: 'Jane', email: 'jane@example.com' },
				],
				range: 'Sheet1!A1:B2',
				keyRowIndex: 1,
				valueInputMode: 'USER_ENTERED',
				lastRow: 3,
			});
		});

		it('should return empty array when no input data', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([]);

			const result = await execute.call(
				mockExecuteFunctions,
				mockSheet,
				'Sheet1!A1:B2',
				'sheet123',
			);

			expect(result).toEqual([]);
			expect(mockSheet.appendSheetData).not.toHaveBeenCalled();
		});

		it('should return empty array when dataMode is nothing', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'dataMode' || paramName === 'columns.mappingMode') {
					return 'nothing';
				}
				return {};
			});

			const result = await execute.call(
				mockExecuteFunctions,
				mockSheet,
				'Sheet1!A1:B2',
				'sheet123',
			);

			expect(result).toEqual([]);
			expect(mockSheet.appendSheetData).not.toHaveBeenCalled();
		});
	});

	describe('Data Mode Handling', () => {
		it('should use autoMapInputData mode when sheet is empty', async () => {
			mockSheet.getData.mockResolvedValue([]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123');

			expect(GoogleSheetsUtils.autoMapInputData).toHaveBeenCalledWith(
				'Sheet1!A1:B2',
				mockSheet,
				[
					{ json: { name: 'John', email: 'john@example.com' }, pairedItem: { item: 0 } },
					{ json: { name: 'Jane', email: 'jane@example.com' }, pairedItem: { item: 1 } },
				],
				{},
			);
		});

		it('should use defineBelow mode when sheet has data', async () => {
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123');

			expect(GoogleSheetsUtils.mapFields).toHaveBeenCalledWith(2);
		});

		it('should handle autoMapInputData mode explicitly', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'dataMode' || paramName === 'columns.mappingMode') {
					return 'autoMapInputData';
				}
				return {};
			});
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123');

			expect(GoogleSheetsUtils.autoMapInputData).toHaveBeenCalled();
		});
	});

	describe('Node Version Handling', () => {
		it('should use dataMode parameter for node version < 4', async () => {
			mockNode.typeVersion = 3;
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'dataMode') return 'autoMapInputData';
				return {};
			});
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123');

			expect(GoogleSheetsUtils.autoMapInputData).toHaveBeenCalled();
		});

		it('should use columns.mappingMode parameter for node version >= 4', async () => {
			mockNode.typeVersion = 4;
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'columns.mappingMode') return 'autoMapInputData';
				return {};
			});
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123');

			expect(GoogleSheetsUtils.autoMapInputData).toHaveBeenCalled();
		});
	});

	describe('Options and Configuration', () => {
		it('should handle custom header row', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') {
					return {
						locationDefine: {
							values: { headerRow: 2 },
						},
					};
				}
				return {};
			});
			mockSheet.getData.mockResolvedValue([
				['Header1', 'Header2'],
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123');

			expect(mockSheet.getData).toHaveBeenCalledWith('Sheet1!A1:B2', 'FORMATTED_VALUE');
		});

		it('should handle useAppend option', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') {
					return { useAppend: true };
				}
				return {};
			});
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123');

			expect(mockSheet.appendSheetData).toHaveBeenCalledWith({
				inputData: [
					{ name: 'John', email: 'john@example.com' },
					{ name: 'Jane', email: 'jane@example.com' },
				],
				range: 'Sheet1!A1:B2',
				keyRowIndex: 1,
				valueInputMode: 'USER_ENTERED',
				useAppend: true,
			});
		});

		it('should handle cell format option', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') {
					return { cellFormat: 'RAW' };
				}
				return {};
			});
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123');

			expect(mockSheet.appendSheetData).toHaveBeenCalledWith(
				expect.objectContaining({
					valueInputMode: 'RAW',
				}),
			);
		});
	});

	describe('Error Handling', () => {
		it('should throw error when column names cannot be retrieved (node version >= 4.4)', async () => {
			mockNode.typeVersion = 4.4;
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'columns.mappingMode') return 'defineBelow';
				if (paramName === 'columns.schema') return [{ id: 'name' }, { id: 'email' }];
				return {};
			});
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);

			// Mock checkForSchemaChanges to throw error
			(GoogleSheetsUtils.checkForSchemaChanges as jest.Mock).mockImplementation(() => {
				throw new NodeOperationError(mockNode, 'Column names were updated');
			});

			await expect(
				execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123'),
			).rejects.toThrow(NodeOperationError);
		});

		it('should throw error when header row is out of bounds', async () => {
			mockNode.typeVersion = 4.4;
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'columns.mappingMode') return 'defineBelow';
				if (paramName === 'columns.schema') return [{ id: 'name' }, { id: 'email' }];
				if (paramName === 'options') {
					return {
						locationDefine: {
							values: { headerRow: 5 },
						},
					};
				}
				return {};
			});
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);

			await expect(
				execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123'),
			).rejects.toThrow('Could not retrieve the column names from row 5');
		});

		it('should handle empty input data gracefully', async () => {
			(GoogleSheetsUtils.mapFields as jest.Mock).mockReturnValue([]);
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);

			(GoogleSheetsUtils.autoMapInputData as jest.Mock).mockResolvedValue([]);

			const result = await execute.call(
				mockExecuteFunctions,
				mockSheet,
				'Sheet1!A1:B2',
				'sheet123',
			);

			expect(result).toEqual([]);
			expect(mockSheet.appendSheetData).not.toHaveBeenCalled();
		});
	});

	describe('Return Data Formatting', () => {
		it('should return original items for node version < 4', async () => {
			mockNode.typeVersion = 3;
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			const result = await execute.call(
				mockExecuteFunctions,
				mockSheet,
				'Sheet1!A1:B2',
				'sheet123',
			);

			expect(result).toHaveLength(2);
			expect(result[0].json).toEqual({ name: 'John', email: 'john@example.com' });
			expect(result[0].pairedItem).toEqual({ item: 0 });
		});

		it('should return mapped data for node version >= 4 with defineBelow mode', async () => {
			mockNode.typeVersion = 4;
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'columns.mappingMode') return 'defineBelow';
				return {};
			});
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			const result = await execute.call(
				mockExecuteFunctions,
				mockSheet,
				'Sheet1!A1:B2',
				'sheet123',
			);

			expect(result).toHaveLength(2);
			expect(result[0].json).toEqual({ name: 'John', email: 'john@example.com' });
			expect(result[0].pairedItem).toEqual({ item: 0 });
		});

		it('should return original items for autoMapInputData mode regardless of node version', async () => {
			mockNode.typeVersion = 4;
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'columns.mappingMode') return 'autoMapInputData';
				return {};
			});
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			const result = await execute.call(
				mockExecuteFunctions,
				mockSheet,
				'Sheet1!A1:B2',
				'sheet123',
			);

			expect(result).toHaveLength(2);
			expect(result[0].json).toEqual({ name: 'John', email: 'john@example.com' });
			expect(result[0].pairedItem).toEqual({ item: 0 });
		});
	});

	describe('Sheet Data Processing', () => {
		it('should calculate lastRow correctly when sheet has data', async () => {
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
				['Jane', 'jane@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123');

			expect(mockSheet.appendEmptyRowsOrColumns).toHaveBeenCalledWith('sheet123', 1, 0);
			expect(mockSheet.appendSheetData).toHaveBeenCalledWith({
				inputData: [
					{ name: 'John', email: 'john@example.com' },
					{ name: 'Jane', email: 'jane@example.com' },
				],
				range: 'Sheet1!A1:B2',
				keyRowIndex: 1,
				valueInputMode: 'USER_ENTERED',
				lastRow: 4,
			});
		});

		it('should handle empty sheet data for lastRow calculation', async () => {
			mockSheet.getData.mockResolvedValue([]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123');

			expect(mockSheet.appendEmptyRowsOrColumns).toHaveBeenCalledWith('sheet123', 1, 0);
			expect(mockSheet.appendSheetData).toHaveBeenCalledWith({
				inputData: [
					{ name: 'John', email: 'john@example.com' },
					{ name: 'Jane', email: 'jane@example.com' },
				],
				range: 'Sheet1!A1:B2',
				keyRowIndex: 1,
				valueInputMode: 'USER_ENTERED',
				lastRow: 1,
			});
		});
	});

	describe('Integration with GoogleSheets Utils', () => {
		it('should call autoMapInputData with correct parameters', async () => {
			mockSheet.getData.mockResolvedValue([]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123');

			expect(GoogleSheetsUtils.autoMapInputData).toHaveBeenCalledWith(
				'Sheet1!A1:B2',
				mockSheet,
				[
					{ json: { name: 'John', email: 'john@example.com' }, pairedItem: { item: 0 } },
					{ json: { name: 'Jane', email: 'jane@example.com' }, pairedItem: { item: 1 } },
				],
				{},
			);
		});

		it('should call mapFields with correct input size', async () => {
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123');

			expect(GoogleSheetsUtils.mapFields).toHaveBeenCalledWith(2);
		});

		it('should call checkForSchemaChanges for node version >= 4.4', async () => {
			mockNode.typeVersion = 4.4;
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'columns.mappingMode') return 'defineBelow';
				if (paramName === 'columns.schema') return [{ id: 'name' }, { id: 'email' }];
				return {};
			});
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			await execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123');

			expect(GoogleSheetsUtils.checkForSchemaChanges).toHaveBeenCalledWith(
				mockNode,
				['Name', 'Email'],
				[{ id: 'name' }, { id: 'email' }],
			);
		});
	});

	describe('Edge Cases', () => {
		it('should handle single item input', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([
				{ json: { name: 'John', email: 'john@example.com' } },
			]);
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			const result = await execute.call(
				mockExecuteFunctions,
				mockSheet,
				'Sheet1!A1:B2',
				'sheet123',
			);

			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({ name: 'John', email: 'john@example.com' });
		});

		it('should handle large input data', async () => {
			const largeInputData = Array.from({ length: 100 }, (_, i) => ({
				json: { name: `User${i}`, email: `user${i}@example.com` },
			}));
			mockExecuteFunctions.getInputData.mockReturnValue(largeInputData);
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			const result = await execute.call(
				mockExecuteFunctions,
				mockSheet,
				'Sheet1!A1:B2',
				'sheet123',
			);

			expect(result).toHaveLength(100);
			expect(mockSheet.appendSheetData).toHaveBeenCalled();
		});

		it('should handle undefined options gracefully', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') return {};
				return {};
			});
			mockSheet.getData.mockResolvedValue([
				['Name', 'Email'],
				['John', 'john@example.com'],
			]);
			mockSheet.appendSheetData.mockResolvedValue([]);

			await expect(
				execute.call(mockExecuteFunctions, mockSheet, 'Sheet1!A1:B2', 'sheet123'),
			).resolves.not.toThrow();
		});
	});
});
