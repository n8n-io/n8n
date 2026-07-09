import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/spreadsheet/delete.operation';
import { apiRequest } from '../../../../v2/transport';
import type { Mock } from 'vitest';

vi.mock('../../../../v2/transport', () => ({
	apiRequest: {
		call: vi.fn(),
	},
}));

describe('GoogleSheetsDeleteSpreadsheet', () => {
	let mockExecuteFunction: IExecuteFunctions;

	beforeEach(() => {
		mockExecuteFunction = {
			getInputData: vi.fn().mockReturnValue([{}]),
			getNodeParameter: vi.fn(),
			helpers: {
				constructExecutionMetaData: vi.fn().mockImplementation((data) => [data]),
			},
		} as unknown as IExecuteFunctions;

		vi.clearAllMocks();
	});

	it('should successfully delete a spreadsheet', async () => {
		const documentId = '1234567890';
		const expectedUrl = `https://www.googleapis.com/drive/v3/files/${documentId}`;

		mockExecuteFunction.getNodeParameter = vi.fn().mockReturnValue(documentId);
		(apiRequest.call as Mock).mockResolvedValue({});

		const result = await execute.call(mockExecuteFunction);

		expect(apiRequest.call).toHaveBeenCalledWith(
			mockExecuteFunction,
			'DELETE',
			'',
			{},
			{},
			expectedUrl,
		);
		expect(result).toHaveLength(1);
		expect(result).toEqual([[{ json: { success: true } }]]);
	});

	it('should handle multiple input items', async () => {
		const documentIds = ['doc1', 'doc2', 'doc3'];
		mockExecuteFunction.getInputData = vi.fn().mockReturnValue([{}, {}, {}]);
		mockExecuteFunction.getNodeParameter = vi
			.fn()
			.mockImplementation((_, index) => documentIds[index]);
		(apiRequest.call as Mock).mockResolvedValue({});

		const result = await execute.call(mockExecuteFunction);

		expect(apiRequest.call).toHaveBeenCalledTimes(3);
		expect(result).toHaveLength(3);
		result.forEach((item) => {
			expect(item).toEqual([{ json: { success: true } }]);
		});
	});

	it('should handle API errors gracefully', async () => {
		const documentId = '1234567890';
		const errorMessage = 'File not found';
		mockExecuteFunction.getNodeParameter = vi.fn().mockReturnValue(documentId);
		(apiRequest.call as Mock).mockRejectedValue(new Error(errorMessage));

		await expect(execute.call(mockExecuteFunction)).rejects.toThrow(Error);
	});

	it('should validate document ID parameter', async () => {
		mockExecuteFunction.getNodeParameter = vi.fn().mockReturnValue(undefined);
		await expect(execute.call(mockExecuteFunction)).rejects.toThrow();
	});

	describe('Resource Locator Modes', () => {
		it('should handle list mode correctly', async () => {
			const documentId = '1234567890';
			mockExecuteFunction.getNodeParameter = vi.fn().mockReturnValue({
				mode: 'list',
				value: documentId,
			});
			(apiRequest.call as Mock).mockResolvedValue({});

			const result = await execute.call(mockExecuteFunction);

			expect(result).toEqual([[{ json: { success: true } }]]);
		});

		it('should handle URL mode correctly', async () => {
			const documentUrl = 'https://docs.google.com/spreadsheets/d/1234567890/edit';
			mockExecuteFunction.getNodeParameter = vi.fn().mockReturnValue({
				mode: 'url',
				value: documentUrl,
			});
			(apiRequest.call as Mock).mockResolvedValue({});

			const result = await execute.call(mockExecuteFunction);

			expect(result).toEqual([[{ json: { success: true } }]]);
		});

		it('should handle ID mode correctly', async () => {
			const documentId = '1234567890';
			mockExecuteFunction.getNodeParameter = vi.fn().mockReturnValue({
				mode: 'id',
				value: documentId,
			});
			(apiRequest.call as Mock).mockResolvedValue({});

			const result = await execute.call(mockExecuteFunction);

			expect(result).toEqual([[{ json: { success: true } }]]);
		});
	});
});
