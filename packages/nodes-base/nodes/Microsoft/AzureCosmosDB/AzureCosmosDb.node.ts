import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { containerFields, containerOperations } from './descriptions/ContainerDescription';
import { itemFields, itemOperations } from './descriptions/ItemDescription';
import { searchContainers, searchItems } from './generalFunctions/dataFetching';

export class AzureCosmosDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure Cosmos Db',
		name: 'azureCosmosDb',
		icon: {
			light: 'file:AzureCosmosDB.svg',
			dark: 'file:AzureCosmosDB.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Azure Cosmos DB API',
		defaults: {
			name: 'Azure Cosmos Db',
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
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
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
			...itemOperations,
			...itemFields,
			...containerOperations,
			...containerFields,
		],
	};

	methods = {
		listSearch: {
			searchContainers,
			searchItems,
		},
	};
}
