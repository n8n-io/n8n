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
				name: 'Delete Reply',
				value: 'delete',
				action: 'Delete a reply to a review',
				description: 'Delete a reply to a review',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/{{$parameter["review"]/reply}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get review',
				description: 'Retrieve details of a specific review on Google My Business',
				routing: {
					request: {
						method: 'GET',
						url: '=/{{$parameter["review"]}}',
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
							pageSize: '={{$parameter["limit"]<50 ? $parameter["limit"] : 50}}', // Google allows maximum 50 results per page
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
						url: '=/{{$parameter["review"]}}/reply',
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
		type: 'resourceLocator',
		default: '',
		description: 'The Google My Business account',
		displayOptions: { show: { resource: ['review'], operation: ['get'] } },
		modes: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the account ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+',
							errorMessage: 'The ID must start with "accounts/"',
						},
					},
				],
				placeholder: 'accounts/012345678901234567890',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchAccounts',
					searchable: true,
				},
			},
		],
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'resourceLocator',
		default: '',
		description: 'The specific location or business associated with the account',
		displayOptions: { show: { resource: ['review'], operation: ['get'] } },
		modes: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the location ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'locations/[0-9]+',
							errorMessage: 'The ID must start with "locations/"',
						},
					},
				],
				placeholder: 'locations/012345678901234567',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchLocations',
					searchable: true,
				},
			},
		],
	},
	{
		displayName: 'Review',
		name: 'review',
		required: true,
		type: 'resourceLocator',
		default: '',
		description: 'Select the review by name or URL to retrieve its details',
		displayOptions: { show: { resource: ['review'], operation: ['get'] } },
		modes: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the location ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+/locations/[0-9]+/reviews/.*$',
							errorMessage: 'The ID must start with "localPosts/123/locations/123/reviews/"',
						},
					},
				],
				placeholder: 'accounts/0123456789/locations/0123456789/reviews/review-id',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchReviews',
					searchable: true,
				},
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                              review:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'resourceLocator',
		default: '',
		description: 'The Google My Business account',
		displayOptions: { show: { resource: ['review'], operation: ['delete'] } },
		modes: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the account ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+',
							errorMessage: 'The ID must start with "accounts/"',
						},
					},
				],
				placeholder: 'accounts/012345678901234567890',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchAccounts',
					searchable: true,
				},
			},
		],
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'resourceLocator',
		default: '',
		description: 'The specific location or business associated with the account',
		displayOptions: { show: { resource: ['review'], operation: ['delete'] } },
		modes: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the location ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'locations/[0-9]+',
							errorMessage: 'The ID must start with "locations/"',
						},
					},
				],
				placeholder: 'locations/012345678901234567',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchLocations',
					searchable: true,
				},
			},
		],
	},
	{
		displayName: 'Review',
		name: 'review',
		required: true,
		type: 'resourceLocator',
		default: '',
		description: 'Select the review by name or URL to retrieve its details',
		displayOptions: { show: { resource: ['review'], operation: ['delete'] } },
		modes: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the location id',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+/locations/[0-9]+/reviews/.*$',
							errorMessage: 'The ID must start with "localPosts/123/locations/123/reviews/"',
						},
					},
				],
				placeholder: 'accounts/0123456789/locations/0123456789/reviews/review-id',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchReviews',
					searchable: true,
				},
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 review:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'resourceLocator',
		default: '',
		description: 'The Google My Business account',
		displayOptions: { show: { resource: ['review'], operation: ['getAll'] } },
		modes: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the account ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+',
							errorMessage: 'The ID must start with "accounts/"',
						},
					},
				],
				placeholder: 'accounts/012345678901234567890',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchAccounts',
					searchable: true,
				},
			},
		],
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'resourceLocator',
		default: '',
		description: 'The specific location or business associated with the account',
		displayOptions: { show: { resource: ['review'], operation: ['getAll'] } },
		modes: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the location ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'locations/[0-9]+',
							errorMessage: 'The ID must start with "locations/"',
						},
					},
				],
				placeholder: 'locations/012345678901234567',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchLocations',
					searchable: true,
				},
			},
		],
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
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'resourceLocator',
		default: '',
		description: 'The Google My Business account',
		displayOptions: { show: { resource: ['review'], operation: ['reply'] } },
		modes: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the account ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+',
							errorMessage: 'The ID must start with "accounts/"',
						},
					},
				],
				placeholder: 'accounts/012345678901234567890',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchAccounts',
					searchable: true,
				},
			},
		],
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'resourceLocator',
		default: '',
		description: 'The specific location or business associated with the account',
		displayOptions: { show: { resource: ['review'], operation: ['reply'] } },
		modes: [
			{
				displayName: 'ID',
				name: 'is',
				type: 'string',
				hint: 'Enter the location ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'locations/[0-9]+',
							errorMessage: 'The ID must start with "locations/"',
						},
					},
				],
				placeholder: 'locations/012345678901234567',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchLocations',
					searchable: true,
				},
			},
		],
	},
	{
		displayName: 'Review',
		name: 'review',
		required: true,
		type: 'resourceLocator',
		default: '',
		description: 'Select the review by ID or URL to retrieve its details',
		displayOptions: { show: { resource: ['review'], operation: ['reply'] } },
		modes: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the location ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+/locations/[0-9]+/reviews/.*$',
							errorMessage: 'The name must start with "localPosts/123/locations/123/reviews/"',
						},
					},
				],
				placeholder: 'accounts/0123456789/locations/0123456789/reviews/review-id',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchReviews',
					searchable: true,
				},
			},
		],
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
