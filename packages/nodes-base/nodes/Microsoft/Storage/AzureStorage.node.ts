import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { blobFields, blobOperations, containerFields, containerOperations } from './descriptions';
import { getBlobs, getContainers } from './GenericFunctions';

export class AzureStorage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure Storage',
		name: 'azureStorage',
		icon: {
			light: 'file:azureStorage.svg',
			dark: 'file:azureStorage.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Azure Storage API',
		defaults: {
			name: 'Azure Storage',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'azureStorageOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
			{
				name: 'azureStorageSharedKeyApi',
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
						name: 'OAuth2',
						value: 'oAuth2',
					},
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
						name: 'Blob',
						value: 'blob',
					},
					{
						name: 'Container',
						value: 'container',
					},
				],
				default: 'container',
			},

			...blobOperations,
			...blobFields,
			...containerOperations,
			...containerFields,
		],
	};

	methods = {
		loadOptions: {},

		listSearch: {
			getBlobs,
			getContainers,
		},
	};
}
