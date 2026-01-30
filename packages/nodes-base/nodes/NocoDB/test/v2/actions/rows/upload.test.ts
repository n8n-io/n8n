import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/rows/upload.operation';
import { apiRequest, apiRequestAllItems } from '../../../../v2/transport';

jest.mock('../../../../v2/transport/index', () => {
	const originalModule = jest.requireActual('../../../../v2/transport/index');
	return {
		...originalModule,
		apiRequest: { call: jest.fn() },
		apiRequestAllItems: { call: jest.fn() },
	};
});

describe('NocoDB Rows Upload Action', () => {
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
		(apiRequestAllItems.call as jest.Mock).mockClear();
	});

	const mockReturnValue = { id: '1', fields: { testFieldName: [] } };

	describe('base64 upload mode', () => {
		it('should upload a file successfully in base64 mode', async () => {
			// Mock parameters
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'testProjectId';
				if (name === 'table') return 'testTable';
				if (name === 'id') return 'testRowId';
				if (name === 'uploadFieldName') return 'testFieldName';
				if (name === 'uploadMode') return 'base64';
				if (name === 'contentType') return 'image/jpeg';
				if (name === 'filename') return 'test.jpg';
				if (name === 'base64value') return 'base64encodeddata';
				return undefined;
			});

			// Mock API response
			(apiRequest.call as jest.Mock).mockResolvedValueOnce(mockReturnValue);

			const result = await execute.call(mockExecuteFunctions);

			// Assertions
			expect(mockExecuteFunctions.getInputData).toHaveBeenCalled();
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'projectId',
				0,
				undefined,
				{ extractValue: true },
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('table', 0, undefined, {
				extractValue: true,
			});
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('id', 0, undefined, {
				extractValue: true,
			});
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'uploadFieldName',
				0,
				undefined,
				{ extractValue: true },
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('uploadMode', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'contentType',
				0,
				undefined,
				{ extractValue: true },
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('filename', 0, undefined, {
				extractValue: true,
			});
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'base64value',
				0,
				undefined,
				{ extractValue: true },
			);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'POST',
				'/api/v3/data/testProjectId/testTable/records/testRowId/fields/testFieldName/upload',
				{
					contentType: 'image/jpeg',
					file: 'base64encodeddata',
					filename: 'test.jpg',
				},
				{},
			);
			expect(mockExecuteFunctions.helpers.returnJsonArray).toHaveBeenCalledWith([mockReturnValue]);
			expect(result).toEqual([[[mockReturnValue]]]);
		});
	});

	describe('url upload mode', () => {
		it('should upload a file successfully in url mode when existing field is empty', async () => {
			// Mock parameters
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'testProjectId';
				if (name === 'table') return 'testTable';
				if (name === 'id') return 'testRowId';
				if (name === 'uploadFieldName') return 'testFieldName';
				if (name === 'uploadMode') return 'url';
				if (name === 'url') return 'http://example.com/test.jpg';
				return undefined;
			});

			// Mock API responses
			(apiRequest.call as jest.Mock)
				.mockResolvedValueOnce({ fields: { testFieldName: [] } }) // GET existing data
				.mockResolvedValueOnce({ records: [mockReturnValue] }); // PATCH update

			const result = await execute.call(mockExecuteFunctions);

			// Assertions
			expect(mockExecuteFunctions.getInputData).toHaveBeenCalled();
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'projectId',
				0,
				undefined,
				{ extractValue: true },
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('table', 0, undefined, {
				extractValue: true,
			});
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('id', 0, undefined, {
				extractValue: true,
			});
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'uploadFieldName',
				0,
				undefined,
				{ extractValue: true },
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('uploadMode', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('url', 0);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				'/api/v3/data/testProjectId/testTable/records/testRowId',
				{},
				{},
			);
			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'PATCH',
				'/api/v3/data/testProjectId/testTable/records',
				[
					{
						id: 'testRowId',
						fields: {
							testFieldName: [{ url: 'http://example.com/test.jpg' }],
						},
					},
				],
				{},
			);
			expect(mockExecuteFunctions.helpers.returnJsonArray).toHaveBeenCalledWith([mockReturnValue]);
			expect(result).toEqual([[[mockReturnValue]]]);
		});

		it('should upload a file successfully in url mode when existing field is an array', async () => {
			// Mock parameters
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'testProjectId';
				if (name === 'table') return 'testTable';
				if (name === 'id') return 'testRowId';
				if (name === 'uploadFieldName') return 'testFieldName';
				if (name === 'uploadMode') return 'url';
				if (name === 'url') return 'http://example.com/new-file.png';
				return undefined;
			});

			// Mock API responses
			(apiRequest.call as jest.Mock)
				.mockResolvedValueOnce({
					fields: { testFieldName: [{ url: 'http://example.com/existing-file.jpg' }] },
				}) // GET existing data
				.mockResolvedValueOnce({ records: [mockReturnValue] }); // PATCH update

			const result = await execute.call(mockExecuteFunctions);

			// Assertions
			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				'/api/v3/data/testProjectId/testTable/records/testRowId',
				{},
				{},
			);
			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'PATCH',
				'/api/v3/data/testProjectId/testTable/records',
				[
					{
						id: 'testRowId',
						fields: {
							testFieldName: [
								{ url: 'http://example.com/existing-file.jpg' },
								{ url: 'http://example.com/new-file.png' },
							],
						},
					},
				],
				{},
			);
			expect(mockExecuteFunctions.helpers.returnJsonArray).toHaveBeenCalledWith([mockReturnValue]);
			expect(result).toEqual([[[mockReturnValue]]]);
		});

		it('should upload a file successfully in url mode when existing field is a string', async () => {
			// Mock parameters
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'testProjectId';
				if (name === 'table') return 'testTable';
				if (name === 'id') return 'testRowId';
				if (name === 'uploadFieldName') return 'testFieldName';
				if (name === 'uploadMode') return 'url';
				if (name === 'url') return 'http://example.com/new-file.png';
				return undefined;
			});

			// Mock API responses
			(apiRequest.call as jest.Mock)
				.mockResolvedValueOnce({
					fields: { testFieldName: '[{"url":"http://example.com/existing-file.jpg"}]' },
				}) // GET existing data as string
				.mockResolvedValueOnce({ records: [mockReturnValue] }); // PATCH update

			const result = await execute.call(mockExecuteFunctions);

			// Assertions
			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				'/api/v3/data/testProjectId/testTable/records/testRowId',
				{},
				{},
			);
			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'PATCH',
				'/api/v3/data/testProjectId/testTable/records',
				[
					{
						id: 'testRowId',
						fields: {
							testFieldName: [
								{ url: 'http://example.com/existing-file.jpg' },
								{ url: 'http://example.com/new-file.png' },
							],
						},
					},
				],
				{},
			);
			expect(mockExecuteFunctions.helpers.returnJsonArray).toHaveBeenCalledWith([mockReturnValue]);
			expect(result).toEqual([[[mockReturnValue]]]);
		});
	});

	describe('error handling', () => {
		it('should return an error object when API request fails and continueOnFail is true', async () => {
			// Mock parameters for base64 mode
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'testProjectId';
				if (name === 'table') return 'testTable';
				if (name === 'id') return 'testRowId';
				if (name === 'uploadFieldName') return 'testFieldName';
				if (name === 'uploadMode') return 'base64';
				if (name === 'contentType') return 'image/jpeg';
				if (name === 'filename') return 'test.jpg';
				if (name === 'base64value') return 'base64encodeddata';
				return undefined;
			});
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

			// Mock API response to throw an error
			const apiError = new Error('API request failed');
			(apiRequest.call as jest.Mock).mockRejectedValueOnce(apiError);

			const result = await execute.call(mockExecuteFunctions);

			// Assertions
			expect(mockExecuteFunctions.continueOnFail).toHaveBeenCalled();
			expect(result).toEqual([[[{ error: apiError.toString() }]]]);
		});

		it('should throw NodeApiError when API request fails and continueOnFail is false', async () => {
			// Mock parameters for base64 mode
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'testProjectId';
				if (name === 'table') return 'testTable';
				if (name === 'id') return 'testRowId';
				if (name === 'uploadFieldName') return 'testFieldName';
				if (name === 'uploadMode') return 'base64';
				if (name === 'contentType') return 'image/jpeg';
				if (name === 'filename') return 'test.jpg';
				if (name === 'base64value') return 'base64encodeddata';
				return undefined;
			});
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);

			// Mock API response to throw an error
			const apiError = new Error('API request failed');
			(apiRequest.call as jest.Mock).mockRejectedValueOnce(apiError);

			await expect(execute.call(mockExecuteFunctions)).rejects.toThrow('API request failed');
		});
	});
});
