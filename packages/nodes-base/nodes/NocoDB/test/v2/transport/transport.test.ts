import type { IDataObject, IHttpRequestMethods } from 'n8n-workflow';

import { apiRequest, apiRequestAllItems, downloadRecordAttachments } from '../../../v2/transport';

describe('NocoDB Transport API', () => {
	let mockThis: any;

	beforeEach(() => {
		mockThis = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn(),
			helpers: {
				requestWithAuthentication: jest.fn(),
				prepareBinaryData: jest.fn(),
			},
			getNode: jest.fn(() => ({ id: 'node1' })),
		};
	});

	describe('apiRequest', () => {
		it('should make a successful API request with authentication', async () => {
			mockThis.getNodeParameter.mockReturnValue('nocodbApi');
			mockThis.getCredentials.mockResolvedValue({
				host: 'http://localhost:8080',
				apiKey: 'test-api-key',
			});
			mockThis.helpers.requestWithAuthentication.mockResolvedValue({ success: true });

			const method: IHttpRequestMethods = 'GET';
			const endpoint = '/api/v2/test';
			const body: IDataObject = {};
			const query: IDataObject = { param: 'value' };

			const result = await apiRequest.call(mockThis, method, endpoint, body, query);

			expect(mockThis.getNodeParameter).toHaveBeenCalledWith('authentication', 0);
			expect(mockThis.getCredentials).toHaveBeenCalledWith('nocodbApi');
			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('nocodbApi', {
				method: 'GET',
				qs: { param: 'value' },
				url: 'http://localhost:8080/api/v2/test',
				json: true,
			});
			expect(result).toEqual({ success: true });
		});

		it('should handle empty body correctly', async () => {
			mockThis.getNodeParameter.mockReturnValue('nocodbApi');
			mockThis.getCredentials.mockResolvedValue({
				host: 'http://localhost:8080',
				apiKey: 'test-api-key',
			});
			mockThis.helpers.requestWithAuthentication.mockResolvedValue({ success: true });

			const method: IHttpRequestMethods = 'POST';
			const endpoint = '/api/v2/test';
			const body: IDataObject = {}; // Empty body
			const query: IDataObject = {};

			await apiRequest.call(mockThis, method, endpoint, body, query);

			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('nocodbApi', {
				method: 'POST',
				qs: {},
				url: 'http://localhost:8080/api/v2/test',
				json: true,
			});
		});

		it('should use provided URI if available', async () => {
			mockThis.getNodeParameter.mockReturnValue('nocodbApi');
			mockThis.getCredentials.mockResolvedValue({
				host: 'http://localhost:8080',
				apiKey: 'test-api-key',
			});
			mockThis.helpers.requestWithAuthentication.mockResolvedValue({ success: true });

			const method: IHttpRequestMethods = 'GET';
			const endpoint = '/api/v2/test';
			const body: IDataObject = {};
			const query: IDataObject = {};
			const customUri = 'http://custom.url/path';

			await apiRequest.call(mockThis, method, endpoint, body, query, customUri);

			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('nocodbApi', {
				method: 'GET',
				qs: {},
				url: customUri,
				json: true,
			});
		});

		it('should merge additional options', async () => {
			mockThis.getNodeParameter.mockReturnValue('nocodbApi');
			mockThis.getCredentials.mockResolvedValue({
				host: 'http://localhost:8080',
				apiKey: 'test-api-key',
			});
			mockThis.helpers.requestWithAuthentication.mockResolvedValue({ success: true });

			const method: IHttpRequestMethods = 'GET';
			const endpoint = '/api/v2/test';
			const body: IDataObject = {};
			const query: IDataObject = {};
			const option: IDataObject = { timeout: 5000 };

			await apiRequest.call(mockThis, method, endpoint, body, query, undefined, option);

			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('nocodbApi', {
				method: 'GET',
				qs: {},
				url: 'http://localhost:8080/api/v2/test',
				json: true,
				timeout: 5000,
			});
		});
	});

	describe('apiRequestAllItems', () => {
		it('should fetch all items from a paginated endpoint (version 4)', async () => {
			mockThis.getNodeParameter.mockReturnValueOnce(4); // version 4
			mockThis.getNodeParameter.mockReturnValue('nocodbApi');
			mockThis.getCredentials.mockResolvedValue({
				host: 'http://localhost:8080',
				apiKey: 'test-api-key',
			});

			// Mock apiRequest to simulate pagination
			mockThis.helpers.requestWithAuthentication
				.mockResolvedValueOnce({ records: [{ id: 1 }, { id: 2 }], next: 'next-page-url' })
				.mockResolvedValueOnce({ records: [{ id: 3 }], next: null });

			const method: IHttpRequestMethods = 'GET';
			const endpoint = '/api/v2/data';
			const body: IDataObject = {};
			const query: IDataObject = {};

			const result = await apiRequestAllItems.call(mockThis, method, endpoint, body, query);

			expect(mockThis.getNodeParameter).toHaveBeenCalledWith('version', 0);
			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
			expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
		});

		it('should fetch all items from a paginated endpoint (non-version 4)', async () => {
			mockThis.getNodeParameter.mockReturnValueOnce(1); // non-version 4
			mockThis.getNodeParameter.mockReturnValue('nocodbApi');
			mockThis.getCredentials.mockResolvedValue({
				host: 'http://localhost:8080',
				apiKey: 'test-api-key',
			});

			// Mock apiRequest to simulate pagination
			mockThis.helpers.requestWithAuthentication
				.mockResolvedValueOnce({ list: [{ id: 1 }, { id: 2 }], pageInfo: { isLastPage: false } })
				.mockResolvedValueOnce({ list: [{ id: 3 }], pageInfo: { isLastPage: true } });

			const method: IHttpRequestMethods = 'GET';
			const endpoint = '/api/v2/data';
			const body: IDataObject = {};
			const query: IDataObject = {};

			const result = await apiRequestAllItems.call(mockThis, method, endpoint, body, query);

			expect(mockThis.getNodeParameter).toHaveBeenCalledWith('version', 0);
			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
			expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
		});
	});

	describe('downloadRecordAttachments', () => {
		it('should download attachments for records (version 4)', async () => {
			mockThis.getNodeParameter.mockReturnValueOnce(4); // version 4
			mockThis.getNodeParameter.mockReturnValue('nocodbApi');
			mockThis.getCredentials.mockResolvedValue({
				host: 'http://localhost:8080',
				apiKey: 'test-api-key',
			});

			const mockFileBuffer = Buffer.from('test file content');
			mockThis.helpers.requestWithAuthentication.mockResolvedValue(mockFileBuffer);
			mockThis.helpers.prepareBinaryData.mockResolvedValue({
				data: mockFileBuffer.toString('base64'),
				mimeType: 'image/jpeg',
				fileName: 'image.jpg',
			});

			const records = [
				{
					id: 1,
					fields: {
						attachments: [
							{
								url: 'http://localhost:8080/file1.jpg',
								title: 'image.jpg',
								mimetype: 'image/jpeg',
								size: 100,
							},
						],
					},
				},
			];
			const fieldNames = ['attachments'];

			const result = await downloadRecordAttachments.call(mockThis, records, fieldNames);

			expect(mockThis.getNodeParameter).toHaveBeenCalledWith('version', 0);
			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('nocodbApi', {
				method: 'GET',
				url: 'http://localhost:8080/file1.jpg',
				json: false,
				qs: {},
				encoding: null,
			});
			expect(mockThis.helpers.prepareBinaryData).toHaveBeenCalledWith(
				mockFileBuffer,
				'image.jpg',
				'image/jpeg',
			);
			expect(result).toEqual([
				{
					json: {
						id: 1,
						fields: {
							attachments: [
								{
									url: 'http://localhost:8080/file1.jpg',
									title: 'image.jpg',
									mimetype: 'image/jpeg',
									size: 100,
								},
							],
						},
					},
					binary: {
						attachments_0: {
							data: mockFileBuffer.toString('base64'),
							mimeType: 'image/jpeg',
							fileName: 'image.jpg',
						},
					},
				},
			]);
		});

		it('should download attachments for records (non-version 4)', async () => {
			mockThis.getNodeParameter.mockReturnValueOnce(1); // non-version 4
			mockThis.getNodeParameter.mockReturnValue('nocodbApi');
			mockThis.getCredentials.mockResolvedValue({
				host: 'http://localhost:8080',
				apiKey: 'test-api-key',
			});

			const mockFileBuffer = Buffer.from('test file content');
			mockThis.helpers.requestWithAuthentication.mockResolvedValue(mockFileBuffer);
			mockThis.helpers.prepareBinaryData.mockResolvedValue({
				data: mockFileBuffer.toString('base64'),
				mimeType: 'image/png',
				fileName: 'document.png',
			});

			const records = [
				{
					id: 1,
					attachments: [
						{
							url: 'http://localhost:8080/file2.png',
							title: 'document.png',
							mimetype: 'image/png',
							size: 200,
						},
					],
				},
			];
			const fieldNames = ['attachments'];

			const result = await downloadRecordAttachments.call(mockThis, records, fieldNames);

			expect(mockThis.getNodeParameter).toHaveBeenCalledWith('version', 0);
			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('nocodbApi', {
				method: 'GET',
				url: 'http://localhost:8080/file2.png',
				json: false,
				qs: {},
				encoding: null,
			});
			expect(mockThis.helpers.prepareBinaryData).toHaveBeenCalledWith(
				mockFileBuffer,
				'document.png',
				'image/png',
			);
			expect(result).toEqual([
				{
					json: {
						id: 1,
						attachments: [
							{
								url: 'http://localhost:8080/file2.png',
								title: 'document.png',
								mimetype: 'image/png',
								size: 200,
							},
						],
					},
					binary: {
						attachments_0: {
							data: mockFileBuffer.toString('base64'),
							mimeType: 'image/png',
							fileName: 'document.png',
						},
					},
				},
			]);
		});

		it('should handle attachments as string (json parsed)', async () => {
			mockThis.getNodeParameter.mockReturnValueOnce(1); // non-version 4
			mockThis.getNodeParameter.mockReturnValue('nocodbApi');
			mockThis.getCredentials.mockResolvedValue({
				host: 'http://localhost:8080',
				apiKey: 'test-api-key',
			});

			const mockFileBuffer = Buffer.from('another file content');
			mockThis.helpers.requestWithAuthentication.mockResolvedValue(mockFileBuffer);
			mockThis.helpers.prepareBinaryData.mockResolvedValue({
				data: mockFileBuffer.toString('base64'),
				mimeType: 'application/pdf',
				fileName: 'doc.pdf',
			});

			const records = [
				{
					id: 1,
					attachments: JSON.stringify([
						{
							url: 'http://localhost:8080/file3.pdf',
							title: 'doc.pdf',
							mimetype: 'application/pdf',
							size: 300,
						},
					]),
				},
			];
			const fieldNames = ['attachments'];

			const result = await downloadRecordAttachments.call(mockThis, records, fieldNames);

			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('nocodbApi', {
				method: 'GET',
				url: 'http://localhost:8080/file3.pdf',
				json: false,
				qs: {},
				encoding: null,
			});
			expect(mockThis.helpers.prepareBinaryData).toHaveBeenCalledWith(
				mockFileBuffer,
				'doc.pdf',
				'application/pdf',
			);
			expect(result).toEqual([
				{
					json: {
						id: 1,
						attachments: JSON.stringify([
							{
								url: 'http://localhost:8080/file3.pdf',
								title: 'doc.pdf',
								mimetype: 'application/pdf',
								size: 300,
							},
						]),
					},
					binary: {
						attachments_0: {
							data: mockFileBuffer.toString('base64'),
							mimeType: 'application/pdf',
							fileName: 'doc.pdf',
						},
					},
				},
			]);
		});

		it('should handle records without attachments', async () => {
			mockThis.getNodeParameter.mockReturnValueOnce(1); // non-version 4
			mockThis.getNodeParameter.mockReturnValue('nocodbApi');
			mockThis.getCredentials.mockResolvedValue({
				host: 'http://localhost:8080',
				apiKey: 'test-api-key',
			});

			const records = [{ id: 1, attachments: [] }];
			const fieldNames = ['attachments'];

			const result = await downloadRecordAttachments.call(mockThis, records, fieldNames);

			expect(mockThis.helpers.requestWithAuthentication).not.toHaveBeenCalled();
			expect(mockThis.helpers.prepareBinaryData).not.toHaveBeenCalled();
			expect(result).toEqual([{ json: { id: 1, attachments: [] } }]);
		});
	});
});
