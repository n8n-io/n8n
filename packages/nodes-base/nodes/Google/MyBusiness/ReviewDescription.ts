import type { INodeProperties } from 'n8n-workflow';
import { handleSimplifyPostReceive } from './GenericFunctions';

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
					output: { postReceive: [handleSimplifyPostReceive] },
					request: {
						method: 'GET',
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/reviews',
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
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'options',
		default: '',
		description: 'The Google My Business account name',
		placeholder: 'accounts/012345678901234567890',
		displayOptions: { show: { resource: ['review'], operation: ['get'] } },
		typeOptions: { loadOptionsMethod: 'getAccounts' },
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'options',
		default: '',
		description: 'The specific location or business associated with the account',
		placeholder: 'locations/012345678901234567',
		displayOptions: { show: { resource: ['review'], operation: ['get'] } },
		typeOptions: {
			loadOptionsMethod: 'getLocations',
			loadOptionsDependsOn: ['account'],
		 },
	},
	{
		displayName: 'Review',
		name: 'review',
		type: 'options',
		default: '',
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
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'options',
		default: '',
		description: 'The Google My Business account name',
		placeholder: 'accounts/012345678901234567890',
		displayOptions: { show: { resource: ['review'], operation: ['getAll'] } },
		typeOptions: { loadOptionsMethod: 'getAccounts' },
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'options',
		default: '',
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
			maxValue: 50, // ToDo: Remove after pagination is implemented
		},
		default: 20,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['review'], operation: ['getAll'] } },
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: false,
		description:
			'Whether the response to include only the name, URL, and call-to-action button fields',
		displayOptions: { show: { resource: ['review'], operation: ['getAll'] } },
	},

	/* -------------------------------------------------------------------------- */
	/*                                 review:reply                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'options',
		default: '',
		description: 'The Google My Business account name',
		placeholder: 'accounts/012345678901234567890',
		displayOptions: { show: { resource: ['review'], operation: ['reply'] } },
		typeOptions: { loadOptionsMethod: 'getAccounts' },
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'options',
		default: '',
		description: 'The specific location or business associated with the account',
		placeholder: 'locations/012345678901234567',
		displayOptions: { show: { resource: ['review'], operation: ['reply'] } },
		typeOptions: {
			loadOptionsMethod: 'getLocations',
			loadOptionsDependsOn: ['account'],
		},
	},
	{
		displayName: 'Review Name',
		name: 'reviewName',
		type: 'options',
		default: '',
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
