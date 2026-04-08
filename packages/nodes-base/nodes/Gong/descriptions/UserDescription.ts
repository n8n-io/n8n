import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import {
	getCursorPaginatorUsers,
	isValidNumberIds,
	handleErrorPostReceive,
} from '../GenericFunctions';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve data for a specific user',
				action: 'Get user',
				routing: {
					request: {
						method: 'POST',
						url: '/v2/users/extensive',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of users',
				action: 'Get many users',
				routing: {
					request: {
						method: 'POST',
						url: '/v2/users/extensive',
						body: {
							filter: {},
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
			},
		],
		default: 'get',
	},
];

const getOperation: INodeProperties[] = [
	{
		displayName: 'User to Get',
		name: 'user',
		default: {
			mode: 'list',
			value: '',
		},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		required: true,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getUsers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				placeholder: 'e.g. 7782342274025937895',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[0-9]{1,20}',
							errorMessage: 'Not a valid Gong User ID',
						},
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'filter.userIds',
				propertyInDotNotation: true,
				value: '={{ [$value] }}',
			},
			output: {
				postReceive: [
					{
						type: 'rootProperty',
						properties: {
							property: 'users',
						},
					},
				],
			},
		},
		type: 'resourceLocator',
	},
];

const getAllOperation: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		routing: {
			send: {
				paginate: '={{ $value }}',
			},
			operations: {
				pagination: getCursorPaginatorUsers(),
			},
		},
		type: 'boolean',
		validateType: 'boolean',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		routing: {
			output: {
				postReceive: [
					{
						type: 'rootProperty',
						properties: {
							property: 'users',
						},
					},
					{
						type: 'limit',
						properties: {
							maxResults: '={{ $value }}',
						},
					},
				],
			},
		},
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		validateType: 'number',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Created After',
				name: 'createdFromDateTime',
				default: '',
				description:
					'An optional user creation time lower limit, if supplied the API will return only the users created at or after this time',
				placeholder: 'e.g. 2018-02-18T02:30:00-07:00 or 2018-02-18T08:00:00Z',
				routing: {
					send: {
						type: 'body',
						property: 'filter.createdFromDateTime',
						propertyInDotNotation: true,
						value: '={{ new Date($value).toISOString() }}',
					},
				},
				type: 'dateTime',
				validateType: 'dateTime',
			},
			{
				displayName: 'Created Before',
				name: 'createdToDateTime',
				default: '',
				description:
					'An optional user creation time upper limit, if supplied the API will return only the users created before this time',
				placeholder: 'e.g. 2018-02-18T02:30:00-07:00 or 2018-02-18T08:00:00Z',
				routing: {
					send: {
						type: 'body',
						property: 'filter.createdToDateTime',
						propertyInDotNotation: true,
						value: '={{ new Date($value).toISOString() }}',
					},
				},
				type: 'dateTime',
				validateType: 'dateTime',
			},
			{
				displayName: 'User IDs',
				name: 'userIds',
				default: '',
				description: "Set of Gong's unique numeric identifiers for the users (up to 20 digits)",
				hint: 'Comma separated list of IDs, array of strings can be set in expression',
				routing: {
					send: {
						preSend: [
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								const userIdsParam = this.getNodeParameter('filters.userIds') as
									| number
									| number[]
									| string
									| string[];
								if (userIdsParam && !isValidNumberIds(userIdsParam)) {
									throw new NodeApiError(this.getNode(), {
										message: 'User IDs must be numeric',
										description: "Double-check the value in the parameter 'User IDs' and try again",
									});
								}

								const userIds = Array.isArray(userIdsParam)
									? userIdsParam.map((x) => x.toString())
									: userIdsParam
											.toString()
											.split(',')
											.map((x) => x.trim());

								requestOptions.body ||= {};
								(requestOptions.body as IDataObject).filter ||= {};
								Object.assign((requestOptions.body as IDataObject).filter as IDataObject, {
									userIds,
								});

								return requestOptions;
							},
						],
					},
				},
				placeholder: 'e.g. 7782342274025937895',
				type: 'string',
			},
		],
		placeholder: 'Add Filter',
		type: 'collection',
	},
];

export const userFields: INodeProperties[] = [...getOperation, ...getAllOperation];
