import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import nock from 'nock';
import { Readable } from 'stream';

import { execute } from '../../../../v2/actions/draft/create.operation';
import * as transport from '../../../../v2/transport';

describe('Test MicrosoftOutlookV2, draft => create', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post('/messages', {
			bccRecipients: [
				{ emailAddress: { address: 'name1@mail.com' } },
				{ emailAddress: { address: 'name2@mail.com' } },
			],
			body: { content: 'draft message', contentType: 'Text' },
			categories: [
				'd10cd8f9-14ac-460e-a6ec-c40dd1876ea2',
				'6844a34e-4d23-4805-9fec-38b7f6e1a780',
				'fbf44fcd-7689-43a0-99c8-2c9faf6d825a',
			],
			importance: 'Normal',
			internetMessageHeaders: [{ name: 'x-my-header', value: 'header value' }],
			isReadReceiptRequested: true,
			replyTo: [{ emailAddress: { address: 'reply@mail.com' } }],
			subject: 'New Draft',
			toRecipients: [{ emailAddress: { address: 'some@mail.com' } }],
		})
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#users('b834447b-6848-4af9-8390-d2259ce46b74')/messages/$entity",
			'@odata.etag': 'W/"CQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFW3Bo2"',
			id: 'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAABZf4De-LkrSqpPI8eyjUmAAAFXBDupAAA=',
			createdDateTime: '2023-09-04T09:18:35Z',
			lastModifiedDateTime: '2023-09-04T09:18:35Z',
			changeKey: 'CQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFW3Bo2',
			categories: [
				'd10cd8f9-14ac-460e-a6ec-c40dd1876ea2',
				'6844a34e-4d23-4805-9fec-38b7f6e1a780',
				'fbf44fcd-7689-43a0-99c8-2c9faf6d825a',
			],
			receivedDateTime: '2023-09-04T09:18:35Z',
			sentDateTime: '2023-09-04T09:18:35Z',
			hasAttachments: false,
			internetMessageId:
				'<AM0PR10MB21003DD359041CBE7D64DDB6DDE9A@AM0PR10MB2100.EURPRD10.PROD.OUTLOOK.COM>',
			subject: 'New Draft',
			bodyPreview: 'draft message',
			importance: 'normal',
			parentFolderId:
				'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAuAAAAAABPLqzvT6b9RLP0CKzHiJrRAQBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAAA=',
			conversationId:
				'AAQkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAQAKELKTNBg5JJuTnBGaTDyl0=',
			conversationIndex: 'AQHZ3xDIoQspM0GDkkm5OcEZpMPKXQ==',
			isDeliveryReceiptRequested: false,
			isReadReceiptRequested: true,
			isRead: true,
			isDraft: true,
			webLink:
				'https://outlook.office365.com/owa/?ItemID=AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De%2FLkrSqpPI8eyjUmAAAAAAAEPAABZf4De%2FLkrSqpPI8eyjUmAAAFXBDupAAA%3D&exvsurl=1&viewmodel=ReadMessageItem',
			inferenceClassification: 'focused',
			body: {
				contentType: 'text',
				content: 'draft message',
			},
			toRecipients: [
				{
					emailAddress: {
						name: 'some@mail.com',
						address: 'some@mail.com',
					},
				},
			],
			ccRecipients: [],
			bccRecipients: [
				{
					emailAddress: {
						name: 'name1@mail.com',
						address: 'name1@mail.com',
					},
				},
				{
					emailAddress: {
						name: 'name2@mail.com',
						address: 'name2@mail.com',
					},
				},
			],
			replyTo: [
				{
					emailAddress: {
						name: 'reply@mail.com',
						address: 'reply@mail.com',
					},
				},
			],
			flag: {
				flagStatus: 'notFlagged',
			},
		});

	new NodeTestHarness().setupTests({
		workflowFiles: ['create.workflow.json'],
	});

	describe('with attachments', () => {
		let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
		let microsoftApiRequestSpy: jest.SpyInstance;

		const mockNode: INode = {
			id: 'test-node-id',
			name: 'Microsoft Outlook Test',
			type: 'n8n-nodes-base.microsoftOutlook',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		};

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			microsoftApiRequestSpy = jest.spyOn(transport, 'microsoftApiRequest');

			jest.clearAllMocks();

			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.continueOnFail.mockReturnValue(false);

			(mockExecuteFunctions.helpers.constructExecutionMetaData as jest.Mock).mockImplementation(
				(data: any, options: any) => {
					return data.map((item: any) => ({
						...item,
						pairedItem: { item: options?.itemData?.item ?? 0 },
					}));
				},
			);
			(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation(
				(data: any) => {
					return [{ json: data }];
				},
			);
		});

		afterEach(() => {
			jest.resetAllMocks();
		});

		it('should properly await attachments with binary data stream', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					subject: 'Test Draft with Attachment',
					bodyContent: 'Test message',
					additionalFields: {
						attachments: {
							attachments: [
								{
									binaryPropertyName: 'data',
								},
							],
						},
					},
				};
				return params[paramName];
			});

			const mockBinaryData = {
				id: 'binary-data-id-123',
				mimeType: 'text/plain',
				fileName: 'test-file.txt',
				fileExtension: 'txt',
			};

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);

			const mockStream = Readable.from([Buffer.from('Hello World')]);
			(mockExecuteFunctions.helpers.getBinaryStream as jest.Mock).mockResolvedValue(mockStream);
			(mockExecuteFunctions.helpers.binaryToBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('Hello World'),
			);

			const mockResponse = {
				id: 'draft-id-123',
				subject: 'Test Draft with Attachment',
			};

			microsoftApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await execute.call(mockExecuteFunctions, 0, [{ json: {} }]);

			expect(microsoftApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/messages',
				expect.objectContaining({
					subject: 'Test Draft with Attachment',
					body: expect.objectContaining({
						content: 'Test message',
					}),
					attachments: [
						{
							'@odata.type': '#microsoft.graph.fileAttachment',
							name: 'test-file.txt',
							contentBytes: Buffer.from('Hello World').toString('base64'),
						},
					],
				}),
				{},
			);

			expect(result).toEqual([
				{
					json: mockResponse,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should properly await attachments with direct binary data', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					subject: 'Test Draft',
					bodyContent: 'Test',
					additionalFields: {
						attachments: {
							attachments: [
								{
									binaryPropertyName: 'data',
								},
							],
						},
					},
				};
				return params[paramName];
			});

			const mockBinaryData = {
				data: Buffer.from('Direct data').toString('base64'),
				mimeType: 'text/plain',
				fileName: 'direct-file.txt',
				fileExtension: 'txt',
			};

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);

			microsoftApiRequestSpy.mockResolvedValue({});

			await execute.call(mockExecuteFunctions, 0, [{ json: {} }]);

			expect(microsoftApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/messages',
				expect.objectContaining({
					attachments: [
						{
							'@odata.type': '#microsoft.graph.fileAttachment',
							name: 'direct-file.txt',
							contentBytes: mockBinaryData.data,
						},
					],
				}),
				{},
			);
		});

		it('should properly await multiple attachments', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					subject: 'Test Draft',
					bodyContent: 'Test',
					additionalFields: {
						attachments: {
							attachments: [{ binaryPropertyName: 'file1' }, { binaryPropertyName: 'file2' }],
						},
					},
				};
				return params[paramName];
			});

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock)
				.mockReturnValueOnce({
					id: 'id1',
					fileName: 'file1.txt',
				})
				.mockReturnValueOnce({
					data: 'ZmlsZTI=',
					fileName: 'file2.txt',
				});

			const mockStream1 = Readable.from([Buffer.from('file1')]);
			(mockExecuteFunctions.helpers.getBinaryStream as jest.Mock).mockResolvedValue(mockStream1);
			(mockExecuteFunctions.helpers.binaryToBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('file1'),
			);

			microsoftApiRequestSpy.mockResolvedValue({});

			await execute.call(mockExecuteFunctions, 0, [{ json: {} }]);

			expect(microsoftApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/messages',
				expect.objectContaining({
					attachments: expect.arrayContaining([
						expect.objectContaining({
							name: 'file1.txt',
							contentBytes: Buffer.from('file1').toString('base64'),
						}),
						expect.objectContaining({
							name: 'file2.txt',
							contentBytes: 'ZmlsZTI=',
						}),
					]),
				}),
				{},
			);
		});
	});
});
