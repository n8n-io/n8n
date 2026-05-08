import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	pipedriveApiRequest,
	pipedriveApiRequestAllItemsCursor,
	pipedriveApiRequestAllItemsOffset,
	pipedriveGetCustomProperties,
	sortOptionParameters,
} from '../../v2/transport/pipedrive.api';

describe('Pipedrive v2 Transport', () => {
	let mockExecuteFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getNodeParameter.mockReturnValue('apiToken');
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'test-node-id',
			name: 'Pipedrive',
			type: 'n8n-nodes-base.pipedrive',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		});
	});

	describe('pipedriveApiRequest', () => {
		it('should use v2 base URL by default', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: [{ id: 1 }],
				additional_data: {},
			});

			await pipedriveApiRequest.call(mockExecuteFunctions, 'GET', '/deals', {});

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'pipedriveApi',
				expect.objectContaining({
					uri: 'https://api.pipedrive.com/api/v2/deals',
				}),
			);
		});

		it('should use v1 base URL when apiVersion is v1', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: [{ id: 1 }],
				additional_data: {},
			});

			await pipedriveApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/leads',
				{},
				{},
				{
					apiVersion: 'v1',
				},
			);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'pipedriveApi',
				expect.objectContaining({
					uri: 'https://api.pipedrive.com/v1/leads',
				}),
			);
		});

		it('should use OAuth2 credentials when authentication is oAuth2', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('oAuth2');
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: [{ id: 1 }],
				additional_data: {},
			});

			await pipedriveApiRequest.call(mockExecuteFunctions, 'GET', '/deals', {});

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'pipedriveOAuth2Api',
				expect.any(Object),
			);
		});

		it('should return data and additionalData from response', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: [{ id: 1, name: 'Test Deal' }],
				additional_data: { next_cursor: 'abc123' },
			});

			const result = await pipedriveApiRequest.call(mockExecuteFunctions, 'GET', '/deals', {});

			expect(result).toEqual({
				additionalData: { next_cursor: 'abc123' },
				data: [{ id: 1, name: 'Test Deal' }],
			});
		});

		it('should return empty array when data is null', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: null,
				additional_data: {},
			});

			const result = await pipedriveApiRequest.call(mockExecuteFunctions, 'GET', '/deals', {});

			expect(result.data).toEqual([]);
		});

		it('should pass body when not empty', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: { id: 1 },
				additional_data: {},
			});

			await pipedriveApiRequest.call(mockExecuteFunctions, 'POST', '/deals', {
				title: 'New Deal',
			});

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'pipedriveApi',
				expect.objectContaining({
					body: { title: 'New Deal' },
				}),
			);
		});

		it('should handle download file option', async () => {
			const fileBuffer = Buffer.from('file-content');
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue(fileBuffer);

			const result = await pipedriveApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/files/1/download',
				{},
				{},
				{ downloadFile: true },
			);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'pipedriveApi',
				expect.objectContaining({
					encoding: null,
				}),
			);
			expect(result.data).toBe(fileBuffer);
		});

		it('should throw NodeApiError when API returns success: false', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: false,
				error: 'Something went wrong',
			});

			await expect(
				pipedriveApiRequest.call(mockExecuteFunctions, 'GET', '/deals', {}),
			).rejects.toThrow(NodeApiError);
		});

		it('should throw NodeApiError on request failure', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockRejectedValue(
				new Error('Network error'),
			);

			await expect(
				pipedriveApiRequest.call(mockExecuteFunctions, 'GET', '/deals', {}),
			).rejects.toThrow(NodeApiError);
		});

		it('should pass formData when provided', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: { id: 1 },
				additional_data: {},
			});

			await pipedriveApiRequest.call(
				mockExecuteFunctions,
				'POST',
				'/files',
				{},
				{},
				{ formData: { file: 'binary-data' } },
			);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'pipedriveApi',
				expect.objectContaining({
					formData: { file: 'binary-data' },
				}),
			);
		});
	});

	describe('pipedriveApiRequestAllItemsCursor', () => {
		it('should follow cursor tokens across multiple pages', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication
				.mockResolvedValueOnce({
					success: true,
					data: [{ id: 1 }, { id: 2 }],
					additional_data: { next_cursor: 'cursor_page2' },
				})
				.mockResolvedValueOnce({
					success: true,
					data: [{ id: 3 }, { id: 4 }],
					additional_data: { next_cursor: 'cursor_page3' },
				})
				.mockResolvedValueOnce({
					success: true,
					data: [{ id: 5 }],
					additional_data: {},
				});

			const result = await pipedriveApiRequestAllItemsCursor.call(
				mockExecuteFunctions,
				'GET',
				'/deals',
				{},
			);

			expect(result.data).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(3);
		});

		it('should handle empty response', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: [],
				additional_data: {},
			});

			const result = await pipedriveApiRequestAllItemsCursor.call(
				mockExecuteFunctions,
				'GET',
				'/deals',
				{},
			);

			expect(result.data).toEqual([]);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		it('should handle single-page response with no cursor', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: [{ id: 1 }],
				additional_data: {},
			});

			const result = await pipedriveApiRequestAllItemsCursor.call(
				mockExecuteFunctions,
				'GET',
				'/deals',
				{},
			);

			expect(result.data).toEqual([{ id: 1 }]);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		it('should set limit to 500', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: [],
				additional_data: {},
			});

			await pipedriveApiRequestAllItemsCursor.call(mockExecuteFunctions, 'GET', '/deals', {});

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'pipedriveApi',
				expect.objectContaining({
					qs: expect.objectContaining({ limit: 500 }),
				}),
			);
		});
	});

	describe('pipedriveApiRequestAllItemsOffset', () => {
		it('should follow offset pagination across multiple pages', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication
				.mockResolvedValueOnce({
					success: true,
					data: [{ id: 1 }, { id: 2 }],
					additional_data: {
						pagination: { more_items_in_collection: true, next_start: 100 },
					},
				})
				.mockResolvedValueOnce({
					success: true,
					data: [{ id: 3 }],
					additional_data: {
						pagination: { more_items_in_collection: false },
					},
				});

			const result = await pipedriveApiRequestAllItemsOffset.call(
				mockExecuteFunctions,
				'GET',
				'/leadFields',
				{},
			);

			expect(result.data).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
		});

		it('should use v1 API version', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: [{ id: 1 }],
				additional_data: { pagination: { more_items_in_collection: false } },
			});

			await pipedriveApiRequestAllItemsOffset.call(mockExecuteFunctions, 'GET', '/leadFields', {});

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'pipedriveApi',
				expect.objectContaining({
					uri: expect.stringContaining('https://api.pipedrive.com/v1'),
				}),
			);
		});

		it('should set limit to 100 and start to 0', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: [],
				additional_data: { pagination: { more_items_in_collection: false } },
			});

			await pipedriveApiRequestAllItemsOffset.call(mockExecuteFunctions, 'GET', '/leadFields', {});

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'pipedriveApi',
				expect.objectContaining({
					qs: expect.objectContaining({ limit: 100, start: 0 }),
				}),
			);
		});

		it('should handle empty data response', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: [],
				additional_data: { pagination: { more_items_in_collection: false } },
			});

			const result = await pipedriveApiRequestAllItemsOffset.call(
				mockExecuteFunctions,
				'GET',
				'/leadFields',
				{},
			);

			expect(result.data).toEqual([]);
		});
	});

	describe('pipedriveGetCustomProperties', () => {
		it('should use v2 endpoint for deal resource and parse v2 field format', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: [
					{
						field_code: 'abc123hash',
						field_name: 'Custom Field',
						field_type: 'text',
						options: null,
					},
				],
				additional_data: {},
			});

			const result = await pipedriveGetCustomProperties.call(mockExecuteFunctions, 'deal');

			expect(result).toEqual({
				abc123hash: {
					key: 'abc123hash',
					name: 'Custom Field',
					field_type: 'text',
					options: null,
				},
			});
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'pipedriveApi',
				expect.objectContaining({
					uri: expect.stringContaining('/api/v2/dealFields'),
				}),
			);
		});

		it('should use v1 endpoint for lead resource and parse v1 field format', async () => {
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: [
					{
						key: 'lead_field_1',
						name: 'Lead Custom',
						field_type: 'varchar',
						options: null,
					},
				],
				additional_data: { pagination: { more_items_in_collection: false } },
			});

			const result = await pipedriveGetCustomProperties.call(mockExecuteFunctions, 'lead');

			expect(result).toEqual({
				lead_field_1: {
					key: 'lead_field_1',
					name: 'Lead Custom',
					field_type: 'varchar',
					options: null,
				},
			});
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'pipedriveApi',
				expect.objectContaining({
					uri: expect.stringContaining('https://api.pipedrive.com/v1/leadFields'),
				}),
			);
		});

		it('should throw for unsupported resources', async () => {
			await expect(
				pipedriveGetCustomProperties.call(mockExecuteFunctions, 'unsupported'),
			).rejects.toThrow(NodeOperationError);
		});
	});

	describe('sortOptionParameters', () => {
		it('should sort options alphabetically by name', () => {
			const options = [
				{ name: 'Charlie', value: 'c' },
				{ name: 'Alpha', value: 'a' },
				{ name: 'Bravo', value: 'b' },
			];

			const sorted = sortOptionParameters(options);

			expect(sorted).toEqual([
				{ name: 'Alpha', value: 'a' },
				{ name: 'Bravo', value: 'b' },
				{ name: 'Charlie', value: 'c' },
			]);
		});

		it('should sort options alphabetically', () => {
			const options = [
				{ name: 'Banana', value: 'b' },
				{ name: 'Apple', value: 'a' },
			];

			const sorted = sortOptionParameters(options);

			expect(sorted).toEqual([
				{ name: 'Apple', value: 'a' },
				{ name: 'Banana', value: 'b' },
			]);
		});

		it('should handle empty array', () => {
			const sorted = sortOptionParameters([]);
			expect(sorted).toEqual([]);
		});
	});
});
