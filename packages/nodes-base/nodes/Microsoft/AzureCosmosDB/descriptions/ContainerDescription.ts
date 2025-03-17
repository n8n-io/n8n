import type { INodeProperties } from 'n8n-workflow';

import {
	processResponseContainers,
	simplifyData,
	validateContainerFields,
} from '../generalFunctions/dataHandling';
import { handleErrorPostReceive } from '../generalFunctions/errorHandling';
import { formatJSONFields } from '../generalFunctions/helpers';
export const containerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['container'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a container',
				routing: {
					send: {
						preSend: [formatJSONFields, validateContainerFields],
					},
					request: {
						ignoreHttpStatusErrors: true,
						method: 'POST',
						url: '/colls',
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Create container',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a container',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'DELETE',
						url: '=/colls/{{ $parameter["collId"] }}',
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							{
								type: 'set',
								properties: {
									value: '={{ { "deleted": true } }}',
								},
							},
						],
					},
				},
				action: 'Delete container',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a container',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						url: '=/colls/{{ $parameter["collId"] }}',
					},
					output: {
						postReceive: [simplifyData, handleErrorPostReceive],
					},
				},
				action: 'Get container',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of containers',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						url: '/colls',
					},
					output: {
						postReceive: [processResponseContainers, simplifyData, handleErrorPostReceive],
					},
				},
				action: 'Get many containers',
			},
		],
		default: 'getAll',
	},
];

export const createFields: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'newid',
		type: 'string',
		default: '',
		placeholder: 'e.g. Container1',
		description: 'Unique identifier for the new container',
		required: true,
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'id',
				value: '={{$value}}',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		default: {},
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Partition Key',
				name: 'partitionKey',
				type: 'json',
				default: '{\n\t"paths": [\n\t\t"/id"\n\t],\n\t"kind": "Hash",\n\t"version": 2\n}',
				description:
					'The partition key is used to automatically distribute data across partitions for scalability. Choose a property in your JSON document that has a wide range of values and evenly distributes request volume.',
				required: true,
			},
			{
				displayName: 'Indexing Policy',
				name: 'indexingPolicy',
				type: 'json',
				default:
					'{\n\t"indexingMode": "consistent",\n\t"automatic": true,\n\t"includedPaths": [\n\t\t{\n\t\t\t"path": "/*"\n\t\t}\n\t],\n\t"excludedPaths": []\n}',
				description: 'This value is used to configure indexing policy',
			},
			{
				displayName: 'Max RU/s (for Autoscale)',
				name: 'maxThroughput',
				type: 'number',
				typeOptions: {
					minValue: 1000,
				},
				default: 1000,
				description: 'The user specified autoscale max RU/s',
			},
			{
				displayName: 'Manual Throughput RU/s',
				name: 'offerThroughput',
				type: 'number',
				default: 400,
				typeOptions: {
					minValue: 400,
				},
				description:
					'The user specified manual throughput (RU/s) for the collection expressed in units of 100 request units per second',
			},
		],
		placeholder: 'Add Option',
		type: 'collection',
	},
];

export const getFields: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'collId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the container you want to retrieve',
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'containerId',
				type: 'string',
				hint: 'Enter the container ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The container ID must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. AndersenFamily',
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['get'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

export const getAllFields: INodeProperties[] = [
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['getAll'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

export const deleteFields: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'collId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the container you want to delete',
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['delete'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'containerId',
				type: 'string',
				hint: 'Enter the container ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The container ID must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. AndersenFamily',
			},
		],
	},
];

export const containerFields: INodeProperties[] = [
	...createFields,
	...deleteFields,
	...getFields,
	...getAllFields,
];
