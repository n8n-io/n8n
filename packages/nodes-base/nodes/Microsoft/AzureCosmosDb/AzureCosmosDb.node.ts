import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { containerFields, containerOperations } from './descriptions/ContainerDescription';
import { searchCollections, searchDatabases } from './GenericFunctions';
import { itemFields, itemOperations } from '../../Aws/DynamoDB/ItemDescription';

export class AzureCosmosDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure Cosmos DB',
		name: 'azureCosmosDb',
		icon: {
			light: 'file:CosmosDB.svg',
			dark: 'file:CosmosDB.svg',
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
				name: 'azureCosmosDbSharedKeyApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['sharedKey'],
					},
				},
			},
		],
		requestDefaults: {
			baseURL: '=https://{$credentials.databaseAccount}.documents.azure.com',
			headers: {
				Accept: 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Shared Key',
						value: 'sharedKey',
					},
				],
				default: 'sharedKey',
			},
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
			...itemFields,
			...itemOperations,
			...containerOperations,
			...containerFields,
		],
	};

	methods = {
		listSearch: {
			searchCollections,
			searchDatabases,
		},
	};
}
