import { IDataObject } from 'n8n-workflow';
import { INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const objectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['object'],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve a list of objects',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/b/" + $parameter["bucketName"] + "/o/"}}',
						returnFullResponse: true,
						qs: {},
					},
					send: {
						preSend: [
							async function (this, requestOptions) {
								if (!requestOptions.qs) requestOptions.qs = {};
								const options = this.getNodeParameter('getFilters') as IDataObject;

								// Merge in the options into the queryset
								requestOptions.qs = Object.assign(requestOptions.qs, options);

								// Check if we send a limit
								const returnAll = this.getNodeParameter('returnAll') as boolean;
								if (!returnAll) requestOptions.qs.maxResults = this.getNodeParameter('maxResults');

								// Return the request data
								return requestOptions;
							},
						],
						paginate: true,
					},
					operations: {
						async pagination(this, requestOptions) {
							if (!requestOptions.options.qs) requestOptions.options.qs = {};
							let executions: INodeExecutionData[] = [];
							let responseData: INodeExecutionData[];
							let nextPageToken: string | undefined = undefined;
							const returnAll = this.getNodeParameter('returnAll') as boolean;

							do {
								requestOptions.options.qs.pageToken = nextPageToken;
								responseData = await this.makeRoutingRequest(requestOptions);

								// Check for another page
								const lastItem = responseData[responseData.length - 1].json;
								nextPageToken = lastItem.nextPageToken as string | undefined;

								// Extract just the list of buckets from the page data
								responseData.forEach((page) => {
									const objects = page.json.items as IDataObject[];
									if (objects) {
										executions = executions.concat(objects.map((object) => ({ json: object })));
									}
								});
							} while (returnAll && nextPageToken);

							// Return all execution responses as an array
							return executions;
						},
					},
				},
				action: 'Get a list of objects',
			},
		],
		default: 'getAll',
	},
];

export const objectFields: INodeProperties[] = [
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		placeholder: 'Bucket Name',
		required: true,
		displayOptions: {
			show: {
				resource: ['object'],
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
		default: 'noAcl',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Parameters',
		name: 'getFilters',
		type: 'collection',
		placeholder: 'Add Additional Parameters',
		displayOptions: {
			show: {
				resource: ['object'],
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Delimiter',
				name: 'delimiter',
				type: 'string',
				placeholder: 'Returns results in directory-like mode, using this value as the delimiter',
				default: '/',
			},
			{
				displayName: 'End Offset',
				name: 'endOffset',
				type: 'string',
				placeholder: 'Filter results to names lexicographically before this value',
				default: '',
			},
			{
				displayName: 'Include Trailing Delimiter',
				name: 'includeTrailingDelimiter',
				type: 'boolean',
				placeholder: 'If true, objects will appear with exactly one instance of delimiter at the end of the name',
				default: false,
			},
			{
				displayName: 'Prefix',
				name: 'prefix',
				type: 'string',
				placeholder: 'Filter results to names that start with this value',
				default: '',
			},
			{
				displayName: 'Start Offset',
				name: 'startOffset',
				type: 'string',
				placeholder: 'Filter results to names lexicographically equal or after this value',
				default: '',
			},
			{
				displayName: 'Versions',
				name: 'versions',
				type: 'boolean',
				placeholder: 'If true, list all versions of objects as distinct entries',
				default: false,
			},
		],
	},
];
