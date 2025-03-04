import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { containerFields, containerOperations } from './descriptions/ContainerDescription';
import { itemFields, itemOperations } from './descriptions/ItemDescription';
import { getProperties, searchContainers, searchItems } from './GenericFunctions';

export class CosmosDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cosmos DB',
		name: 'cosmosDb',
		icon: {
			light: 'file:CosmosDB.svg',
			dark: 'file:CosmosDB.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Cosmos DB API',
		defaults: {
			name: 'Cosmos Db',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'microsoftCosmosDbSharedKeyApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
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
			getProperties,
		},
	};
}
