import type { IExecuteFunctions, INodeParameters } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { GoogleDocs } from '../GoogleDocs.node';

describe('Google Docs document input and errors', () => {
	const documentId = 'uploaded-document_123';
	const node = new GoogleDocs();

	const setup = (operation: string, documentURL: string) => {
		const context = mockDeep<IExecuteFunctions>();
		const parameters: INodeParameters = {
			authentication: 'oAuth2',
			resource: 'document',
			operation,
			documentURL,
			simple: false,
			actionsUi: {
				actionFields: [
					{
						object: 'text',
						action: 'insert',
						text: 'Example text',
						insertSegment: 'body',
						locationChoice: 'endOfSegmentLocation',
					},
				],
			},
			updateFields: {},
		};

		context.getNode.mockReturnValue({
			id: 'google-docs-test',
			name: 'Google Docs',
			type: 'n8n-nodes-base.googleDocs',
			typeVersion: 2,
			position: [0, 0],
			parameters,
		});
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name) => parameters[name] as never);
		context.continueOnFail.mockReturnValue(false);
		context.helpers.returnJsonArray.mockImplementation((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		);
		context.helpers.constructExecutionMetaData.mockImplementation((data, { itemData }) =>
			data.map((item) => ({ ...item, pairedItem: itemData })),
		);

		return context;
	};

	// NODE-6259: Drive links must use the file ID, not the full URL, in Docs API requests.
	describe.each(['get', 'update'])('%s', (operation) => {
		it.each([
			['Google Docs URL', `https://docs.google.com/document/d/${documentId}/edit`],
			['Google Docs URL without a suffix', `https://docs.google.com/document/d/${documentId}`],
			['bare ID', documentId],
			['Drive file URL', `https://drive.google.com/file/d/${documentId}/view?usp=sharing`],
			['Drive file URL without a suffix', `https://drive.google.com/file/d/${documentId}`],
			['Drive open URL', `https://drive.google.com/open?id=${documentId}`],
		])('should use the document ID from a %s', async (_label, documentURL) => {
			const context = setup(operation, documentURL);
			const response =
				operation === 'get'
					? { documentId, title: 'Example Google Doc', body: { content: [] } }
					: { documentId, replies: [{}] };
			context.helpers.requestOAuth2.mockResolvedValue(response);

			const result = await node.execute.call(context);

			expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleDocsOAuth2Api',
				expect.objectContaining({
					method: operation === 'get' ? 'GET' : 'POST',
					uri: `https://docs.googleapis.com/v1/documents/${documentId}${
						operation === 'update' ? ':batchUpdate' : ''
					}`,
				}),
			);
			expect(result).toEqual([[{ json: response, pairedItem: { item: 0 } }]]);
		});

		it.each([
			`https://drive.google.com/file/d/${documentId}/view?usp=sharing`,
			`https://drive.google.com/open?id=${documentId}`,
		])('should retain the API error for an unsupported Drive file: %s', async (documentURL) => {
			const context = setup(operation, documentURL);
			const message = 'This operation is not supported for this document';
			const error = {
				error: { code: 400, message, status: 'FAILED_PRECONDITION' },
			};
			context.helpers.requestOAuth2.mockRejectedValue(
				Object.assign(new Error(`400 - ${JSON.stringify(error)}`), {
					statusCode: 400,
					error,
					response: {
						statusCode: 400,
						headers: { 'content-type': 'application/json; charset=UTF-8' },
						body: error,
					},
				}),
			);

			await expect(node.execute.call(context)).rejects.toMatchObject({
				httpCode: '400',
				message: 'Bad request - please check your parameters',
				description: message,
			});
			expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleDocsOAuth2Api',
				expect.objectContaining({
					method: operation === 'get' ? 'GET' : 'POST',
					uri: `https://docs.googleapis.com/v1/documents/${documentId}${
						operation === 'update' ? ':batchUpdate' : ''
					}`,
				}),
			);
		});
	});

	it.each([
		'Invalid user <name@example.com>',
		'Invalid value <document-id>',
		'Invalid value <html-file>',
	])('should retain a non-HTML API error: %s', async (message) => {
		const context = setup('get', documentId);
		context.helpers.requestOAuth2.mockRejectedValue({
			statusCode: 400,
			error: { message },
		});

		await expect(node.execute.call(context)).rejects.toMatchObject({
			httpCode: '400',
			message: 'Bad request - please check your parameters',
			description: message,
		});
	});

	it.each([
		[401, 'Authorization failed - please check your credentials'],
		[403, 'Forbidden - perhaps check your credentials?'],
		[404, 'The resource you are requesting could not be found'],
		[429, 'The service is receiving too many requests from you'],
		[500, 'The service was not able to process your request'],
		[502, 'Bad gateway - the service failed to handle your request'],
		[
			503,
			'Service unavailable - try again later or consider setting this node to retry automatically (in the node settings)',
		],
		[504, 'Gateway timed out - perhaps try again later?'],
	])('should retain status guidance for an API %s error', async (statusCode, message) => {
		const context = setup('get', documentId);
		context.helpers.requestOAuth2.mockRejectedValue({
			statusCode,
			error: { error: { code: statusCode, message: 'Request failed' } },
		});

		await expect(node.execute.call(context)).rejects.toMatchObject({
			httpCode: String(statusCode),
			message,
			description: 'Request failed',
		});
	});
});
