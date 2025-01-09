import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { blobFields, blobOperations, containerFields, containerOperations } from './descriptions';
import { getBlobs, getContainers } from './GenericFunctions';

export class MicrosoftStorage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Storage',
		name: 'microsoftStorage',
		icon: {
			light: 'file:microsoftStorage.svg',
			dark: 'file:microsoftStorage.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Microsoft Storage API',
		defaults: {
			name: 'Microsoft Storage',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'microsoftStorageOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
			{
				name: 'microsoftStorageSharedKeyApi',
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
