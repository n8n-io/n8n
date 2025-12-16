import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { container, item } from './descriptions';
import { listSearch } from './methods';

export class AzureCosmosDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure Cosmos DB',
		name: 'azureCosmosDb',
		icon: {
			light: 'file:AzureCosmosDb.svg',
			dark: 'file:AzureCosmosDb.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with Azure Cosmos DB API',
		defaults: {
			name: 'Azure Cosmos DB',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'microsoftAzureCosmosDbSharedKeyApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL:
				'=https://{{ $credentials.account }}.documents.azure.com/dbs/{{ $credentials.database }}',
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
