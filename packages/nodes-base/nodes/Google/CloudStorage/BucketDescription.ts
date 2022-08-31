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
];

interface BucketListResponse {
	kind: string;
	nextPageToken?: string;
	items: IDataObject[];
}
