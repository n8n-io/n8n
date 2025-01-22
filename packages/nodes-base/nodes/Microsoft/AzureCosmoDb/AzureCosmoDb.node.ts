import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { searchCollections } from './GenericFunctions';
import { itemFields, itemOperations } from '../../Aws/DynamoDB/ItemDescription';

export class AzureCosmoDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure Cosmo DB',
		name: 'azureCosmoDb',
		icon: {
			light: 'file:CosmoDB.svg',
			dark: 'file:CosmoDB.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Azure Cosmo DB API',
		defaults: {
			name: 'Azure Cosmo Db',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'azureCosmoDbSharedKeyApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['sharedKey'],
					},
				},
			},
		],
		requestDefaults: {
			baseURL: '={{ $credentials.baseUrl }}',
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
						value: 'colls',
					},
					{
						name: 'Item',
						value: 'docs',
					},
				],
				default: 'collections',
			},
			...itemFields,
			...itemOperations,
		],
	};

	methods = {
		listSearch: {
			searchCollections,
		},
	};
}
