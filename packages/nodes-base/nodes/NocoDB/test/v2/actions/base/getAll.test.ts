import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/base/getAll';
import { apiRequest } from '../../../../v2/transport';

jest.mock('../../../../v2/transport/index', () => {
	const originalModule = jest.requireActual('../../../../v2/transport/index');
	return {
		...originalModule,
		apiRequest: { call: jest.fn() },
	};
});

describe('NocoDB getAll Node', () => {
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
	});

	// Test case 1: workspaceId is provided
	it('should return bases for a given workspaceId', async () => {
		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValueOnce('testWorkspaceId');
		(apiRequest.call as jest.Mock).mockResolvedValueOnce({
			list: [{ id: 'base1' }, { id: 'base2' }],
		});

		const result = await execute.call(mockExecuteFunctions);
		expect(apiRequest.call).toHaveBeenCalledWith(
			expect.anything(),
			'GET',
			'/api/v3/meta/workspaces/testWorkspaceId/bases',
			{},
			{},
		);
		expect(result).toEqual([[[{ id: 'base1' }, { id: 'base2' }]]]);
	});

	// Test case 2: workspaceId is not provided (or 'none')
	it('should return all bases when no workspaceId is provided', async () => {
		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValueOnce('none');
		(apiRequest.call as jest.Mock).mockResolvedValueOnce({
			list: [{ id: 'baseA' }, { id: 'baseB' }],
		});

		const result = await execute.call(mockExecuteFunctions);

		expect(apiRequest.call).toHaveBeenCalledWith(
			expect.anything(),
			'GET',
			'/api/v2/meta/bases/',
			{},
			{},
		);
		expect(result).toEqual([[[{ id: 'baseA' }, { id: 'baseB' }]]]);
	});

	// Test case 3: Error handling with continueOnFail = true
	it('should return error data when apiRequest fails and continueOnFail is true', async () => {
		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValueOnce('testWorkspaceId');
		(apiRequest.call as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
		(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValueOnce(true);

		const result = await execute.call(mockExecuteFunctions);

		expect(result[0][0][0]).toHaveProperty('error');
		expect((result[0][0][0] as any).error).toContain('API Error');
	});

	// Test case 4: Error handling with continueOnFail = false
	it('should throw NodeApiError when apiRequest fails and continueOnFail is false', async () => {
		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValueOnce('testWorkspaceId');
		(apiRequest.call as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
		(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValueOnce(false);

		await expect(execute.call(mockExecuteFunctions)).rejects.toThrow(NodeApiError);
	});
});
