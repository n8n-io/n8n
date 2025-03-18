import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { container, item } from './descriptions';
import { listSearch } from './methods';

export class AzureCosmosDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure Cosmos DB',
		name: 'azureCosmosDb',
		icon: {
			light: 'file:azureCosmosDb.svg',
			dark: 'file:azureCosmosDb.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with Azure Cosmos DB API',
		defaults: {
			name: 'Azure Cosmos DB',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'microsoftAzureCosmosDbSharedKeyApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{ $credentials.baseUrl }}',
			json: true,
			ignoreHttpStatusErrors: true,
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Container',
						value: 'container',
					},
					{
						name: 'Item',
						value: 'item',
					},
				],
				default: 'container',
			},

			...container.description,
			...item.description,
		],
	};

	methods = {
		listSearch,
	};
}
