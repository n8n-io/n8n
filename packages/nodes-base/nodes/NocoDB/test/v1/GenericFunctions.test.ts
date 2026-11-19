import { requestPath } from 'n8n-workflow';

import { apiRequest, downloadRecordAttachments } from '../../v1/GenericFunctions';

describe('NocoDB v1 GenericFunctions', () => {
	let mockThis: any;

	beforeEach(() => {
		mockThis = {
			getNodeParameter: vi.fn().mockReturnValue('nocoDbApiToken'),
			getCredentials: vi.fn().mockResolvedValue({
				host: 'http://localhost:8080',
				apiKey: 'test-api-key',
			}),
			helpers: {
				requestWithAuthentication: vi.fn().mockResolvedValue(Buffer.from('file')),
				request: vi.fn().mockResolvedValue(Buffer.from('file')),
				prepareBinaryData: vi.fn().mockResolvedValue({ data: 'file' }),
			},
			getNode: vi.fn(() => ({ id: 'node1' })),
		};
	});

	describe('apiRequest', () => {
		it('should send credentials to the NocoDB host', async () => {
			await apiRequest.call(mockThis, 'GET', requestPath`/api/v1/test`, {});

			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'nocoDbApiToken',
				expect.objectContaining({
					method: 'GET',
					qs: {},
					json: true,
				}),
			);
			const [, options] = mockThis.helpers.requestWithAuthentication.mock.calls[0];
			expect(String(options.uri)).toBe('http://localhost:8080/api/v1/test');
			expect(mockThis.helpers.request).not.toHaveBeenCalled();
		});
	});

	describe('downloadRecordAttachments', () => {
		const download = async (url: string) =>
			await downloadRecordAttachments.call(
				mockThis,
				[{ file: [{ url, title: 'file.png', mimetype: 'image/png' }] }],
				['file'],
			);

		it('should send credentials to an attachment on the NocoDB host without following redirects', async () => {
			await download('http://localhost:8080/file.png');

			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('nocoDbApiToken', {
				method: 'GET',
				qs: {},
				uri: 'http://localhost:8080/file.png',
				json: false,
				encoding: null,
				followRedirect: false,
			});
			expect(mockThis.helpers.request).not.toHaveBeenCalled();
		});

		it('should not send credentials to an attachment on another host', async () => {
			await download('http://other-host.example/file.png');

			expect(mockThis.helpers.requestWithAuthentication).not.toHaveBeenCalled();
			expect(mockThis.helpers.request).toHaveBeenCalledWith({
				method: 'GET',
				qs: {},
				uri: 'http://other-host.example/file.png',
				json: false,
				encoding: null,
			});
		});
	});
});
