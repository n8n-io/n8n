import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { execute } from '../../../../v2/actions/messageAttachment/add.operation';

// Direct unit test for the large-file (chunked) upload path under the Service Principal
// credential. We let the REAL transport run (mocking only requestWithAuthentication) so the
// outgoing createUploadSession URL is genuinely rewritten to /users/{encoded-mailbox}/...,
// then assert the returned (non-Graph) uploadUrl is PUT to verbatim — never re-prefixed.
describe('Microsoft Outlook V2 - Service Principal MessageAttachment:add (large file)', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockRequestWithAuthentication: Mock;

	const mockNode: INode = {
		id: 'test-node-id',
		name: 'Microsoft Outlook Test',
		type: 'n8n-nodes-base.microsoftOutlook',
		typeVersion: 2,
		position: [0, 0],
		parameters: {},
	};

	const messageId = 'AAMkAGI2TG93BBB=';
	// A non-Graph host, as Graph actually returns for attachment upload sessions.
	const uploadUrl =
		"https://outlook.office.com/api/v2.0/Users('user-id')/Messages('AAMkAGI2TG93BBB=')/AttachmentSessions('session-id')?authtoken=token";

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockRequestWithAuthentication = vi.fn();
		mockExecuteFunctions.helpers.requestWithAuthentication = mockRequestWithAuthentication;

		vi.clearAllMocks();

		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		mockExecuteFunctions.getNodeParameter.mockImplementation(((paramName: string) => {
			const params: Record<string, unknown> = {
				authentication: 'microsoftEntraServicePrincipalApi',
				mailbox: 'user@example.com',
				messageId,
				binaryPropertyName: 'data',
				options: {},
			};
			return params[paramName];
		}) as unknown as IExecuteFunctions['getNodeParameter']);
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			accessToken: 'test-access-token',
			graphApiBaseUrl: 'https://graph.microsoft.com',
		});

		const largeBinaryData = Buffer.alloc(4 * 1024 * 1024);
		(mockExecuteFunctions.helpers.assertBinaryData as Mock).mockReturnValue({
			data: largeBinaryData.toString('base64'),
			mimeType: 'application/octet-stream',
			fileName: 'large-file.bin',
			fileExtension: 'bin',
		});
		(mockExecuteFunctions.helpers.getBinaryDataBuffer as Mock).mockResolvedValue(largeBinaryData);
		(mockExecuteFunctions.helpers.constructExecutionMetaData as Mock).mockImplementation(
			(data: Array<{ json: unknown }>) => data,
		);
		(mockExecuteFunctions.helpers.returnJsonArray as Mock).mockImplementation((data: unknown) => [
			{ json: data },
		]);

		// First transport call (createUploadSession) returns the non-Graph uploadUrl.
		mockRequestWithAuthentication.mockResolvedValue({
			'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#microsoft.graph.uploadSession',
			expirationDateTime: '2023-12-19T13:00:00.0000000Z',
			nextExpectedRanges: ['0-'],
			uploadUrl,
		});
		// Chunked PUT goes through helpers.request, bypassing the transport entirely.
		(mockExecuteFunctions.helpers.request as Mock).mockResolvedValue({
			id: 'attachment-id',
			name: 'large-file.bin',
		});
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('rewrites createUploadSession to /users/{encoded-mailbox} and PUTs to the uploadUrl verbatim', async () => {
		await execute.call(mockExecuteFunctions, 0, [{ json: {} }]);

		// createUploadSession was sent to the SP-rewritten, encoded-mailbox URL.
		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'microsoftEntraServicePrincipalApi',
			expect.objectContaining({
				method: 'POST',
				uri: `https://graph.microsoft.com/v1.0/users/user%40example.com/messages/${messageId}/attachments/createUploadSession`,
			}),
		);

		// The chunked PUT used the returned uploadUrl exactly, with no mailbox prefixing.
		expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith(
			uploadUrl,
			expect.objectContaining({ method: 'PUT' }),
		);
		const putUrl = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0] as string;
		expect(putUrl).toBe(uploadUrl);
		expect(putUrl).not.toContain('/users/user%40example.com');
		expect(putUrl).not.toContain('graph.microsoft');
	});
});
