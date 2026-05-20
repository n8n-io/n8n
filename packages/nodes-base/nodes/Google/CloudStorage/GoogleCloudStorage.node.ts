import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { bucketFields, bucketOperations } from './BucketDescription';
import { searchProjects } from './GenericFunctions';
import { objectFields, objectOperations } from './ObjectDescription';

export class GoogleCloudStorage implements INodeType {
	methods = {
		listSearch: { searchProjects },
	};

	description: INodeTypeDescription = {
		displayName: 'Google Cloud Storage',
		name: 'googleCloudStorage',
		icon: 'file:googleCloudStorage.svg',
		group: ['transform'],
		version: [1, 1.1],
		defaultVersion: 1.1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Use the Google Cloud Storage API',
		schemaPath: 'Google/CloudStorage',
		defaults: {
			name: 'Google Cloud Storage',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['serviceAccount'],
					},
				},
			},
			{
				name: 'googleCloudStorageOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
				testedBy: {
					request: {
						method: 'GET',
						url: '/b/',
					},
				},
			},
		],
		requestDefaults: {
			returnFullResponse: true,
			baseURL: 'https://storage.googleapis.com/storage/v1',
		},
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'OAuth2 (recommended)',
						value: 'oAuth2',
					},
					{
						name: 'Service Account',
						value: 'serviceAccount',
					},
				],
				default: 'oAuth2',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Bucket',
						value: 'bucket',
					},
					{
						name: 'Object',
						value: 'object',
					},
				],
				default: 'bucket',
			},

			// BUCKET
			...bucketOperations,
			...bucketFields,

			// OBJECT
			...objectOperations,
			...objectFields,
		],
	};
}
