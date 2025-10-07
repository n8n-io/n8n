import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/rows/get.operation';
import { apiRequest, downloadRecordAttachments } from '../../../../v2/transport';

jest.mock('../../../../v2/transport/index', () => {
	const originalModule = jest.requireActual('../../../../v2/transport/index');
	return {
		...originalModule,
		apiRequest: { call: jest.fn() },
		downloadRecordAttachments: { call: jest.fn() },
	};
});

describe('NocoDB Rows Get Action', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getInputData: jest.fn(() => [{ json: {} }]),
			continueOnFail: jest.fn(() => false),
			helpers: {
				returnJsonArray: jest.fn((data) => [data]),
			},
			getNode: jest.fn(() => {}),
		} as unknown as IExecuteFunctions;
		(apiRequest.call as jest.Mock).mockClear();
		(downloadRecordAttachments.call as jest.Mock).mockClear();
	});

	describe('execute', () => {
		it('should return data for a single row without attachments', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'id') return 'row1';
				if (name === 'downloadAttachments') return false;
				return undefined;
			});
			(apiRequest.call as jest.Mock).mockResolvedValue({ id: 'row1', name: 'Test Row' });

			const result = await execute.call(mockExecuteFunctions);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				'/api/v3/data/base1/table1/records/row1',
				{},
				{},
			);
			expect(result).toEqual([[[{ id: 'row1', name: 'Test Row' }]]]);
		});

		it('should return data for a single row with attachments', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'id') return 'row1';
				if (name === 'downloadAttachments') return true;
				if (name === 'downloadFieldNames') return 'attachmentField';
				return undefined;
			});
			(apiRequest.call as jest.Mock).mockResolvedValue({
				id: 'row1',
				name: 'Test Row',
				attachmentField: 'url',
			});
			(downloadRecordAttachments.call as jest.Mock).mockResolvedValue([
				{ binary: { attachmentField: { data: 'binaryData' } } },
			]);

			const result = await execute.call(mockExecuteFunctions);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				'/api/v3/data/base1/table1/records/row1',
				{},
				{},
			);
			expect(downloadRecordAttachments.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				[{ id: 'row1', name: 'Test Row', attachmentField: 'url' }],
				['attachmentField'],
				[{ item: 0 }],
			);
			expect(result).toEqual([
				[[{ binary: { attachmentField: { data: 'binaryData' } }, json: expect.anything() }]],
			]);
		});

		it('should handle errors and continue on fail', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'id') return 'row1';
				if (name === 'downloadAttachments') return false;
				return undefined;
			});
			(apiRequest.call as jest.Mock).mockRejectedValue(new Error('API Error'));
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

			const result = await execute.call(mockExecuteFunctions);

			expect(result).toEqual([[[{ error: 'Error: API Error' }]]]);
		});

		it('should throw NodeApiError when continueOnFail is false', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'id') return 'row1';
				if (name === 'downloadAttachments') return false;
				return undefined;
			});
			(apiRequest.call as jest.Mock).mockRejectedValue(new Error('API Error'));
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);

			await expect(execute.call(mockExecuteFunctions)).rejects.toThrow('API Error');
		});
	});
});
