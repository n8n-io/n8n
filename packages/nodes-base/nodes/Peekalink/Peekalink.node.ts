import {
	Node,
	NodeApiError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeTypeDescription,
	type JsonObject,
	NodeConnectionTypes,
} from 'n8n-workflow';

export const apiUrl = 'https://api.peekalink.io';

type Operation = 'preview' | 'isAvailable';

export class Peekalink extends Node {
	description: INodeTypeDescription = {
		displayName: 'Peekalink',
		name: 'peekalink',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:peekalink.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]',
		description: 'Consume the Peekalink API',
		defaults: {
			name: 'Peekalink',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'peekalinkApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Is Available',
						value: 'isAvailable',
						description: 'Check whether preview for a given link is available',
						action: 'Check whether the preview for a given link is available',
					},
					{
						name: 'Preview',
						value: 'preview',
						description: 'Return the preview for a link',
						action: 'Return the preview for a link',
					},
				],
				default: 'preview',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
			},
		],
	};

	async execute(context: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = context.getInputData();
		const operation = context.getNodeParameter('operation', 0) as Operation;
		const credentials = await context.getCredentials('peekalinkApi');

		const returnData = await Promise.all(
			items.map(async (_, i) => {
				try {
					const link = context.getNodeParameter('url', i) as string;
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return
					return await context.helpers.request({
						method: 'POST',
						uri: operation === 'preview' ? apiUrl : `${apiUrl}/is-available/`,
						body: { link },
						headers: { 'X-API-Key': credentials.apiKey },
						json: true,
					});
				} catch (error) {
					if (context.continueOnFail()) {
						return { error: error.message };
					}
					throw new NodeApiError(context.getNode(), error as JsonObject);
				}
			}),
		);
		return [context.helpers.returnJsonArray(returnData)];
	}
}
