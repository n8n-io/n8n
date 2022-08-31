import { request } from 'http';
import { IDataObject, INodeTypeData } from 'n8n-workflow';
import {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

export const bucketOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['bucket'],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get list of Buckets for a given project',
				routing: {
					request: {
						method: 'GET',
						url: '/b/',
						qs: {
							project: '={{$parameter["project"]}}',
							prefix: '={{$parameter["prefix"]}}',
						},
					},
					send: {
						paginate: true,
					},
					operations: {
						async pagination(this, requestOptions) {
							if (!requestOptions.options.qs) requestOptions.options.qs = {};
							let executions: INodeExecutionData[] = [];
							let responseData: INodeExecutionData[];
							let nextPageToken: string | undefined = undefined;

							do {
								requestOptions.options.qs.pageToken = nextPageToken;
								responseData = await this.makeRoutingRequest(requestOptions);

								// Check for another page
								const lastItem = responseData[responseData.length - 1].json;
								nextPageToken = lastItem.nextPageToken as string | undefined;

								// Extract just the list of buckets from the page data
								responseData.forEach((page) => {
									const buckets = page.json.items as IDataObject[];
									executions = executions.concat(buckets.map((bucket) => ({ json: bucket })));
								});
							} while (nextPageToken);

							// Return all execution responses as an array
							return executions;
						},
					},
				},
				action: 'Get all Buckets',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get metadata for a specific Bucket',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/b/" + $parameter["bucketId"]}}',
						returnFullResponse: true,
					},
					send: {
						preSend: [
							async function(this, requestOptions) {
								if (!requestOptions.qs) requestOptions.qs = {};
								const options = this.getNodeParameter('getFilters') as IDataObject

								if (options.metagenMatch) requestOptions.qs.ifMetagenerationMatch = options.metagenMatch
								if (options.metagenExclude) requestOptions.qs.ifMetagenerationNotMatch = options.metagenExclude

								console.log(requestOptions.qs)
								return requestOptions
							},
						],
					},
				},
				action: 'Get a Bucket',
			},
		],
		default: 'getAll',
	},
];

export const bucketFields: INodeProperties[] = [
	{
		displayName: 'Project',
		name: 'project',
		type: 'string',
		required: true,
		placeholder: 'project-name',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['getAll', 'create'],
			},
		},
		default: '',
	},
	{
		displayName: 'Bucket ID',
		name: 'bucketId',
		type: 'string',
		required: true,
		placeholder: 'bucket-ID',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['get', 'update', 'delete'],
			},
		},
		default: '',
	},
	{
		displayName: 'Prefix',
		name: 'prefix',
		type: 'string',
		placeholder: 'Filter for Bucket Names',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['getAll'],
			},
		},
		default: '',
	},
	{
		displayName: 'Projection',
		name: 'projection',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'All Properties',
				value: 'full',
			},
			{
				name: 'No ACL',
				value: 'noAcl',
			},
		],
		default: 'full',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['getAll', 'get'],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'getFilters',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['get'],
			},
		},
		default: {},
		placeholder: 'Add Filter',
		options: [
			{
				displayName: 'Metageneration Match',
				name: 'metagenMatch',
				type: 'number',
				description: 'Only return data if the metageneration value of the Bucket matches the sent value',
				default: 0,
			},
			{
				displayName: 'Metageneration Exclude',
				name: 'metagenExclude',
				type: 'number',
				description: 'Only return data if the metageneration value of the Bucket does not match the sent value',
				default: 0,
			},
		]
	}
];

interface BucketListResponse {
	kind: string;
	nextPageToken?: string;
	items: IDataObject[];
}
