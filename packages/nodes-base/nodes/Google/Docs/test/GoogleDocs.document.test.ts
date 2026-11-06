import type { IExecuteFunctions, INodeParameters } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { GoogleDocs } from '../GoogleDocs.node';

describe('Google Docs document input', () => {
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

	it.each(['get', 'update'])(
		'should use the file ID from a Drive URL for %s requests',
		async (operation) => {
			const context = setup(
				operation,
				`https://drive.google.com/file/d/${documentId}/view?usp=sharing`,
			);
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
		},
	);
});
