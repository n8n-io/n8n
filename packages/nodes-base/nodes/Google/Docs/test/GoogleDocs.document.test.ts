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
			['bare ID', documentId],
			['Drive file URL', `https://drive.google.com/file/d/${documentId}/view?usp=sharing`],
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
	});

	// NODE-6259: Use synthetic HTML because the report has no captured response body.
	it.each([
		['German', 'de', 'Dieses Dokument kann nicht geöffnet werden.'],
		['French', 'fr', 'Impossible d’ouvrir ce document.'],
	])(
		'should omit raw HTML from a %s error and retain its HTTP status',
		async (_locale, lang, text) => {
			const context = setup('get', documentId);
			const html = `<!DOCTYPE html><html lang="${lang}"><head><title>Google Docs</title></head><body><p>${text}</p></body></html>`;
			context.helpers.requestOAuth2.mockRejectedValue(
				Object.assign(new Error(`400 - ${JSON.stringify(html)}`), {
					statusCode: 400,
					error: html,
					response: {
						statusCode: 400,
						headers: { 'content-type': 'text/html; charset=UTF-8' },
						body: html,
					},
				}),
			);

			const execution = node.execute.call(context);

			await expect(execution).rejects.toMatchObject({
				httpCode: '400',
				message: expect.not.stringMatching(/<!doctype|<\/?(?:html|head|title|body|p)\b/i),
				description: expect.not.stringMatching(/<!doctype|<\/?(?:html|head|title|body|p)\b/i),
			});
			expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleDocsOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					uri: `https://docs.googleapis.com/v1/documents/${documentId}`,
				}),
			);
		},
	);

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
		['doctype', '<!DOCTYPE html><body>Document error</body>'],
		['HTML root', '<HTML lang="en"><body>Document error</body></HTML>'],
		['content type', '<body>Document error</body>'],
	])('should recognize HTML from the %s', async (source, html) => {
		const context = setup('get', documentId);
		context.helpers.requestOAuth2.mockRejectedValue({
			statusCode: 400,
			error: html,
			response: {
				headers: source === 'content type' ? { 'content-type': 'text/html; charset=UTF-8' } : {},
			},
		});

		await expect(node.execute.call(context)).rejects.toMatchObject({
			httpCode: '400',
			message: 'Google Docs could not process the request (HTTP 400)',
			description: expect.stringContaining('Save as Google Docs'),
		});
	});

	it('should provide document guidance for an HTML error without an HTTP status', async () => {
		const context = setup('get', documentId);
		const html = '<!DOCTYPE html><html><body>Document error</body></html>';
		context.helpers.requestOAuth2.mockRejectedValue(new Error(html));

		await expect(node.execute.call(context)).rejects.toMatchObject({
			httpCode: null,
			message: 'Google Docs could not process the request',
			description: expect.stringContaining('Save as Google Docs'),
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
	])('should retain status guidance for an HTML %s error', async (statusCode, message) => {
		const context = setup('get', documentId);
		const html = '<!DOCTYPE html><html><body>Request failed</body></html>';
		context.helpers.requestOAuth2.mockRejectedValue(
			Object.assign(new Error(`${statusCode} - ${JSON.stringify(html)}`), {
				statusCode,
				error: html,
				response: { headers: { 'content-type': 'text/html' } },
			}),
		);
		const execution = node.execute.call(context);

		await expect(execution).rejects.toMatchObject({
			httpCode: String(statusCode),
			message,
			description: undefined,
		});
		const error: unknown = await execution.catch((error: unknown) => error);
		expect(JSON.stringify(error)).not.toMatch(/<!doctype|<\/?(?:html|body)\b/i);
	});
});
