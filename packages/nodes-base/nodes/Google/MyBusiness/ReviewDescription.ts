import type { INodeProperties } from 'n8n-workflow';
import { handlePagination } from './GenericFunctions';

export const reviewOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		noDataExpression: true,
		displayOptions: { show: { resource: ['review'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get review',
				description: 'Retrieve details of a specific review on Google My Business',
				routing: {
					request: {
						method: 'GET',
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/{{$parameter["reviewName"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many reviews',
				description: 'Retrieve multiple reviews',
				routing: {
					send: { paginate: true },
					operations: { pagination: handlePagination },
					request: {
						method: 'GET',
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/reviews',
						qs: {
							pageSize: '={{$parameter["limit"]<50 ? $parameter["limit"] : 50}}',
						},
					},
				},
			},
			{
				name: 'Reply',
				value: 'reply',
				action: 'Reply to review',
				description: 'Reply to a review',
				routing: {
					request: {
						method: 'PUT',
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/{{$parameter["reviewName"]}}/reply',
					},
				},
			},
		],
	},
];

export const reviewFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 review:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'options',
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'The Google My Business account name',
		placeholder: 'accounts/012345678901234567890',
		displayOptions: { show: { resource: ['review'], operation: ['get'] } },
		typeOptions: { loadOptionsMethod: 'getAccounts' },
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'options',
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'The specific location or business associated with the account',
		placeholder: 'locations/012345678901234567',
		displayOptions: { show: { resource: ['review'], operation: ['get'] } },
		typeOptions: {
			loadOptionsMethod: 'getLocations',
			loadOptionsDependsOn: ['account'],
		},
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Review',
		name: 'review',
		type: 'options',
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'Select the post by name or URL to retrieve its details',
		displayOptions: { show: { resource: ['review'], operation: ['get'] } },
		typeOptions: {
			loadOptionsMethod: 'getReviews',
			loadOptionsDependsOn: ['account', 'location'],
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 review:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'options',
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'The Google My Business account name',
		placeholder: 'accounts/012345678901234567890',
		displayOptions: { show: { resource: ['review'], operation: ['getAll'] } },
		typeOptions: { loadOptionsMethod: 'getAccounts' },
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'options',
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'The specific location or business associated with the account',
		placeholder: 'locations/012345678901234567',
		displayOptions: { show: { resource: ['review'], operation: ['getAll'] } },
		typeOptions: {
			loadOptionsMethod: 'getLocations',
			loadOptionsDependsOn: ['account'],
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		required: true,
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 20,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['review'], operation: ['getAll'] } },
	},

	/* -------------------------------------------------------------------------- */
	/*                                 review:reply                               */
	/* -------------------------------------------------------------------------- */
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'options',
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'The Google My Business account name',
		placeholder: 'accounts/012345678901234567890',
		displayOptions: { show: { resource: ['review'], operation: ['reply'] } },
		typeOptions: { loadOptionsMethod: 'getAccounts' },
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'options',
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'The specific location or business associated with the account',
		placeholder: 'locations/012345678901234567',
		displayOptions: { show: { resource: ['review'], operation: ['reply'] } },
		typeOptions: {
			loadOptionsMethod: 'getLocations',
			loadOptionsDependsOn: ['account'],
		},
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Review Name',
		name: 'reviewName',
		type: 'options',
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'Select the post by name or URL to retrieve its details',
		displayOptions: { show: { resource: ['review'], operation: ['reply'] } },
		typeOptions: {
			loadOptionsMethod: 'getReviews',
			loadOptionsDependsOn: ['account', 'location'],
		},
	},
	{
		displayName: 'Reply',
		name: 'reply',
		type: 'string',
		default: '',
		description: 'The body of the reply (up to 4096 characters)',
		displayOptions: { show: { resource: ['review'], operation: ['reply'] } },
		typeOptions: { rows: 5 },
		routing: { send: { type: 'body', property: 'comment' } },
	},
];
