import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { validateAttachmentUrl, downloadAttachments } from '../GenericFunctions';

describe('KoBoToolbox GenericFunctions', () => {
	describe('validateAttachmentUrl', () => {
		describe('valid URLs', () => {
			it('should accept URL with exact domain match', () => {
				expect(() => {
					validateAttachmentUrl('https://example.com/file.jpg', 'https://example.com');
				}).not.toThrow();
			});

			it('should accept URL with subdomain of allowed domain', () => {
				expect(() => {
					validateAttachmentUrl('https://sub.example.com/file.jpg', 'https://example.com');
				}).not.toThrow();
			});

			it('should accept URL with nested subdomain', () => {
				expect(() => {
					validateAttachmentUrl('https://deep.sub.example.com/file.jpg', 'https://example.com');
				}).not.toThrow();
			});

			it('should accept allowed domain without protocol', () => {
				expect(() => {
					validateAttachmentUrl('https://example.com/file.jpg', 'example.com');
				}).not.toThrow();
			});

			it('should accept HTTP URLs', () => {
				expect(() => {
					validateAttachmentUrl('http://example.com/file.jpg', 'http://example.com');
				}).not.toThrow();
			});

			it('should be case-insensitive for domain matching', () => {
				expect(() => {
					validateAttachmentUrl('https://EXAMPLE.COM/file.jpg', 'https://example.com');
				}).not.toThrow();

				expect(() => {
					validateAttachmentUrl('https://example.com/file.jpg', 'https://EXAMPLE.COM');
				}).not.toThrow();
			});
		});

		describe('KoBoToolbox special domains', () => {
			it('should accept kobotoolbox.org domain when allowed domain is kobotoolbox.org', () => {
				expect(() => {
					validateAttachmentUrl('https://kf.kobotoolbox.org/file.jpg', 'https://kobotoolbox.org');
				}).not.toThrow();
			});

			it('should accept humanitarianresponse.info domain when allowed domain is humanitarianresponse.info', () => {
				expect(() => {
					validateAttachmentUrl(
						'https://kf.humanitarianresponse.info/file.jpg',
						'https://humanitarianresponse.info',
					);
				}).not.toThrow();
			});

			it('should accept cross-domain between kobotoolbox.org subdomains', () => {
				expect(() => {
					validateAttachmentUrl(
						'https://kc.kobotoolbox.org/file.jpg',
						'https://kf.kobotoolbox.org',
					);
				}).not.toThrow();
			});

			it('should accept cross-domain between humanitarianresponse.info subdomains', () => {
				expect(() => {
					validateAttachmentUrl(
						'https://kc.humanitarianresponse.info/file.jpg',
						'https://kf.humanitarianresponse.info',
					);
				}).not.toThrow();
			});

			it('should accept attachment from kobotoolbox.org when allowed is humanitarianresponse.info', () => {
				expect(() => {
					validateAttachmentUrl(
						'https://kc.kobotoolbox.org/file.jpg',
						'https://kf.humanitarianresponse.info',
					);
				}).not.toThrow();
			});

			it('should accept attachment from humanitarianresponse.info when allowed is kobotoolbox.org', () => {
				expect(() => {
					validateAttachmentUrl(
						'https://kc.humanitarianresponse.info/file.jpg',
						'https://kf.kobotoolbox.org',
					);
				}).not.toThrow();
			});
		});

		describe('invalid URLs', () => {
			it('should throw error for invalid attachment URL format', () => {
				expect(() => {
					validateAttachmentUrl('not-a-url', 'https://example.com');
				}).toThrow('Invalid attachment URL format');
			});

			it('should throw error for non-HTTP(S) protocol', () => {
				expect(() => {
					validateAttachmentUrl('ftp://example.com/file.jpg', 'https://example.com');
				}).toThrow('Attachment URL must use HTTP or HTTPS');
			});

			it('should throw error for file:// protocol', () => {
				expect(() => {
					validateAttachmentUrl('file:///etc/passwd', 'https://example.com');
				}).toThrow('Attachment URL must use HTTP or HTTPS');
			});

			it('should throw error for javascript: protocol', () => {
				expect(() => {
					validateAttachmentUrl('javascript:alert(1)', 'https://example.com');
				}).toThrow('Attachment URL must use HTTP or HTTPS');
			});

			it('should throw error for invalid allowed domain configuration', () => {
				expect(() => {
					validateAttachmentUrl('https://example.com/file.jpg', 'not a valid domain!!!');
				}).toThrow('Invalid allowed domain configuration');
			});

			it('should throw error for mismatched domains', () => {
				expect(() => {
					validateAttachmentUrl('https://malicious.com/file.jpg', 'https://example.com');
				}).toThrow(
					'Attachment URL domain (malicious.com) does not match allowed domain (example.com)',
				);
			});

			it('should throw error for domain that looks like subdomain but is not', () => {
				expect(() => {
					validateAttachmentUrl('https://fakeexample.com/file.jpg', 'https://example.com');
				}).toThrow(
					'Attachment URL domain (fakeexample.com) does not match allowed domain (example.com)',
				);
			});

			it('should throw error when attachment is not from KoBoToolbox domains but allowed domain is', () => {
				expect(() => {
					validateAttachmentUrl('https://malicious.com/file.jpg', 'https://kf.kobotoolbox.org');
				}).toThrow(
					'Attachment URL domain (malicious.com) does not match allowed domain (kf.kobotoolbox.org)',
				);
			});

			it('should throw error for loopback IP address when allowed domain is public', () => {
				expect(() => {
					validateAttachmentUrl('http://127.0.0.1/file.jpg', 'https://example.com');
				}).toThrow('Attachment URL domain (127.0.0.1) does not match allowed domain (example.com)');
			});

			it('should throw error for cloud metadata endpoint when allowed domain is public', () => {
				expect(() => {
					validateAttachmentUrl('http://169.254.169.254/file.jpg', 'https://example.com');
				}).toThrow(
					'Attachment URL domain (169.254.169.254) does not match allowed domain (example.com)',
				);
			});

			it('should throw error for localhost when allowed domain is public', () => {
				expect(() => {
					validateAttachmentUrl('http://localhost/file.jpg', 'https://example.com');
				}).toThrow('Attachment URL domain (localhost) does not match allowed domain (example.com)');
			});
		});

		describe('edge cases', () => {
			it('should handle URLs with ports', () => {
				expect(() => {
					validateAttachmentUrl('https://example.com:8080/file.jpg', 'https://example.com:8080');
				}).not.toThrow();
			});

			it('should handle URLs with query parameters', () => {
				expect(() => {
					validateAttachmentUrl('https://example.com/file.jpg?token=abc123', 'https://example.com');
				}).not.toThrow();
			});

			it('should handle URLs with fragments', () => {
				expect(() => {
					validateAttachmentUrl('https://example.com/file.jpg#section', 'https://example.com');
				}).not.toThrow();
			});

			it('should handle URLs with paths', () => {
				expect(() => {
					validateAttachmentUrl('https://example.com/path/to/file.jpg', 'https://example.com');
				}).not.toThrow();
			});
		});
	});

	describe('downloadAttachments', () => {
		let mockExecuteFunctions: IExecuteFunctions;
		let mockGetCredentials: jest.Mock;
		let mockHttpRequest: jest.Mock;
		let mockPrepareBinaryData: jest.Mock;
		let mockGetNode: jest.Mock;

		beforeEach(() => {
			mockGetCredentials = jest.fn();
			mockHttpRequest = jest.fn();
			mockPrepareBinaryData = jest.fn();
			mockGetNode = jest.fn();

			mockExecuteFunctions = {
				getCredentials: mockGetCredentials,
				helpers: {
					httpRequest: mockHttpRequest,
					prepareBinaryData: mockPrepareBinaryData,
				},
				getNode: mockGetNode,
			} as unknown as IExecuteFunctions;

			mockGetCredentials.mockResolvedValue({
				URL: 'https://kf.kobotoolbox.org',
				token: 'test-token-123',
			});

			mockGetNode.mockReturnValue({ name: 'KoBoToolbox' });
		});

		describe('successful downloads', () => {
			it('should download single attachment without redirect', async () => {
				const submission: IDataObject = {
					_id: 123,
					name: 'Test Submission',
					_attachments: [
						{
							filename: 'photo.jpg',
							download_url: 'https://kf.kobotoolbox.org/api/v2/assets/123/data/456/attachments/789',
						},
					],
				};

				const options: IDataObject = {
					version: 'download_url',
					binaryNamingScheme: 'index',
					dataPropertyAttachmentsPrefixName: 'attachment_',
				};

				const mockBuffer = Buffer.from('fake-image-data');
				mockHttpRequest.mockResolvedValue({
					body: mockBuffer,
					headers: {},
				});

				mockPrepareBinaryData.mockResolvedValue({
					data: 'base64-encoded-data',
					mimeType: 'image/jpeg',
					fileName: 'photo.jpg',
				});

				const result = await downloadAttachments.call(mockExecuteFunctions, submission, options);

				expect(result.json).toEqual(submission);
				expect(result.binary).toBeDefined();
				expect(result.binary!.attachment_0).toBeDefined();
				expect(mockHttpRequest).toHaveBeenCalledWith({
					url: 'https://kf.kobotoolbox.org/api/v2/assets/123/data/456/attachments/789',
					method: 'GET',
					headers: {
						Authorization: 'Token test-token-123',
					},
					ignoreHttpStatusErrors: true,
					returnFullResponse: true,
					disableFollowRedirect: true,
					encoding: 'arraybuffer',
				});
				expect(mockPrepareBinaryData).toHaveBeenCalledWith(mockBuffer, 'photo.jpg');
			});

			it('should download multiple attachments', async () => {
				const submission: IDataObject = {
					_id: 123,
					_attachments: [
						{
							filename: 'photo1.jpg',
							download_url: 'https://kf.kobotoolbox.org/attachment1',
						},
						{
							filename: 'photo2.jpg',
							download_url: 'https://kf.kobotoolbox.org/attachment2',
						},
					],
				};

				const options: IDataObject = {
					version: 'download_url',
					binaryNamingScheme: 'index',
					dataPropertyAttachmentsPrefixName: 'file_',
				};

				mockHttpRequest.mockResolvedValue({
					body: Buffer.from('data'),
					headers: {},
				});

				mockPrepareBinaryData.mockResolvedValue({
					data: 'base64-data',
				});

				const result = await downloadAttachments.call(mockExecuteFunctions, submission, options);

				expect(result.binary!.file_0).toBeDefined();
				expect(result.binary!.file_1).toBeDefined();
				expect(mockHttpRequest).toHaveBeenCalledTimes(2);
			});

			it('should follow redirects up to 5 times', async () => {
				const submission: IDataObject = {
					_id: 123,
					_attachments: [
						{
							filename: 'photo.jpg',
							download_url: 'https://kf.kobotoolbox.org/attachment',
						},
					],
				};

				const options: IDataObject = {
					version: 'download_url',
					binaryNamingScheme: 'index',
					dataPropertyAttachmentsPrefixName: 'attachment_',
				};

				mockHttpRequest
					.mockResolvedValueOnce({
						headers: { location: 'https://kc.kobotoolbox.org/redirect1' },
					})
					.mockResolvedValueOnce({
						headers: { location: 'https://kc.kobotoolbox.org/redirect2' },
					})
					.mockResolvedValueOnce({
						body: Buffer.from('final-data'),
						headers: {},
					});

				mockPrepareBinaryData.mockResolvedValue({ data: 'base64-data' });

				const result = await downloadAttachments.call(mockExecuteFunctions, submission, options);

				expect(result.binary!.attachment_0).toBeDefined();
				expect(mockHttpRequest).toHaveBeenCalledTimes(3);
			});

			it('should use question naming scheme when configured', async () => {
				const submission: IDataObject = {
					_id: 123,
					photo_question: 'photo.jpg',
					_attachments: [
						{
							filename: 'photo.jpg',
							download_url: 'https://kf.kobotoolbox.org/attachment',
						},
					],
				};

				const options: IDataObject = {
					version: 'download_url',
					binaryNamingScheme: 'question',
				};

				mockHttpRequest.mockResolvedValue({
					body: Buffer.from('data'),
					headers: {},
				});

				mockPrepareBinaryData.mockResolvedValue({ data: 'base64-data' });

				const result = await downloadAttachments.call(mockExecuteFunctions, submission, options);

				expect(result.binary!.photo_question).toBeDefined();
			});

			it('should handle attachment with suffix in filename', async () => {
				const submission: IDataObject = {
					_id: 123,
					picture: 'My Picture.jpg',
					_attachments: [
						{
							filename: 'My_Picture_0OdlaKJ.jpg',
							download_url: 'https://kf.kobotoolbox.org/attachment',
						},
					],
				};

				const options: IDataObject = {
					version: 'download_url',
					binaryNamingScheme: 'question',
				};

				mockHttpRequest.mockResolvedValue({
					body: Buffer.from('data'),
					headers: {},
				});

				mockPrepareBinaryData.mockResolvedValue({ data: 'base64-data' });

				const result = await downloadAttachments.call(mockExecuteFunctions, submission, options);

				expect(result.binary!.picture).toBeDefined();
			});

			it('should handle submission with "attachments" field instead of "_attachments"', async () => {
				const submission: IDataObject = {
					_id: 123,
					attachments: [
						{
							filename: 'photo.jpg',
							download_url: 'https://kf.kobotoolbox.org/attachment',
						},
					],
				};

				const options: IDataObject = {
					version: 'download_url',
					binaryNamingScheme: 'index',
					dataPropertyAttachmentsPrefixName: 'attachment_',
				};

				mockHttpRequest.mockResolvedValue({
					body: Buffer.from('data'),
					headers: {},
				});

				mockPrepareBinaryData.mockResolvedValue({ data: 'base64-data' });

				const result = await downloadAttachments.call(mockExecuteFunctions, submission, options);

				expect(result.binary!.attachment_0).toBeDefined();
			});
		});

		describe('no attachments', () => {
			it('should return submission without binary when no attachments', async () => {
				const submission: IDataObject = {
					_id: 123,
					name: 'Test Submission',
				};

				const options: IDataObject = {
					version: 'download_url',
					binaryNamingScheme: 'index',
				};

				const result = await downloadAttachments.call(mockExecuteFunctions, submission, options);

				expect(result.json).toEqual(submission);
				expect(result.binary).toBeUndefined();
				expect(mockHttpRequest).not.toHaveBeenCalled();
			});

			it('should return submission without binary when attachments array is empty', async () => {
				const submission: IDataObject = {
					_id: 123,
					_attachments: [],
				};

				const options: IDataObject = {
					version: 'download_url',
					binaryNamingScheme: 'index',
				};

				const result = await downloadAttachments.call(mockExecuteFunctions, submission, options);

				expect(result.json).toEqual(submission);
				expect(result.binary).toBeUndefined();
			});
		});

		describe('error handling', () => {
			it('should throw NodeOperationError for invalid attachment URL', async () => {
				const submission: IDataObject = {
					_id: 123,
					_attachments: [
						{
							filename: 'photo.jpg',
							download_url: 'https://malicious.com/file.jpg',
						},
					],
				};

				const options: IDataObject = {
					version: 'download_url',
					binaryNamingScheme: 'index',
				};

				await expect(
					downloadAttachments.call(mockExecuteFunctions, submission, options),
				).rejects.toThrow(NodeOperationError);
			});

			it('should throw NodeOperationError for invalid redirect URL', async () => {
				const submission: IDataObject = {
					_id: 123,
					_attachments: [
						{
							filename: 'photo.jpg',
							download_url: 'https://kf.kobotoolbox.org/attachment',
						},
					],
				};

				const options: IDataObject = {
					version: 'download_url',
					binaryNamingScheme: 'index',
				};

				mockHttpRequest.mockResolvedValue({
					headers: { location: 'https://malicious.com/redirect' },
				});

				await expect(
					downloadAttachments.call(mockExecuteFunctions, submission, options),
				).rejects.toThrow(NodeOperationError);
			});

			it('should handle missing response body gracefully', async () => {
				const submission: IDataObject = {
					_id: 123,
					_attachments: [
						{
							filename: 'photo.jpg',
							download_url: 'https://kf.kobotoolbox.org/attachment',
						},
					],
				};

				const options: IDataObject = {
					version: 'download_url',
					binaryNamingScheme: 'index',
					dataPropertyAttachmentsPrefixName: 'attachment_',
				};

				mockHttpRequest.mockResolvedValue({
					headers: {},
				});

				const result = await downloadAttachments.call(mockExecuteFunctions, submission, options);

				expect(result.json).toEqual(submission);
				expect(result.binary).toEqual({});
				expect(mockPrepareBinaryData).not.toHaveBeenCalled();
			});
		});

		describe('edge cases', () => {
			it('should fallback to index naming when question not found', async () => {
				const submission: IDataObject = {
					_id: 123,
					other_field: 'value',
					_attachments: [
						{
							filename: 'photo.jpg',
							download_url: 'https://kf.kobotoolbox.org/attachment',
						},
					],
				};

				const options: IDataObject = {
					version: 'download_url',
					binaryNamingScheme: 'question',
					dataPropertyAttachmentsPrefixName: 'file_',
				};

				mockHttpRequest.mockResolvedValue({
					body: Buffer.from('data'),
					headers: {},
				});

				mockPrepareBinaryData.mockResolvedValue({ data: 'base64-data' });

				const result = await downloadAttachments.call(mockExecuteFunctions, submission, options);

				expect(result.binary!.file_0).toBeDefined();
			});

			it('should handle maximum redirect limit', async () => {
				const submission: IDataObject = {
					_id: 123,
					_attachments: [
						{
							filename: 'photo.jpg',
							download_url: 'https://kf.kobotoolbox.org/attachment',
						},
					],
				};

				const options: IDataObject = {
					version: 'download_url',
					binaryNamingScheme: 'index',
					dataPropertyAttachmentsPrefixName: 'attachment_',
				};

				// Mock 4 redirects then final response (loop condition: !final && redir < 5)
				// redir starts at 0, increments after each redirect
				// Loop runs when redir is 0,1,2,3,4 (5 iterations max)
				mockHttpRequest
					.mockResolvedValueOnce({ headers: { location: 'https://kc.kobotoolbox.org/r1' } })
					.mockResolvedValueOnce({ headers: { location: 'https://kc.kobotoolbox.org/r2' } })
					.mockResolvedValueOnce({ headers: { location: 'https://kc.kobotoolbox.org/r3' } })
					.mockResolvedValueOnce({ headers: { location: 'https://kc.kobotoolbox.org/r4' } })
					.mockResolvedValueOnce({
						body: Buffer.from('data'),
						headers: {},
					});

				mockPrepareBinaryData.mockResolvedValue({ data: 'base64-data' });

				const result = await downloadAttachments.call(mockExecuteFunctions, submission, options);

				// Should make 5 total requests: 4 redirects + 1 final
				expect(result.binary!.attachment_0).toBeDefined();
				expect(mockHttpRequest).toHaveBeenCalledTimes(5);
			});
		});
	});
});
