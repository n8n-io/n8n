import type { INodeProperties } from 'n8n-workflow';

import {
	handleErrorsDeleteReply,
	handleErrorsGetReview,
	handleErrorsReplyToReview,
	handlePagination,
} from './GenericFunctions';

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
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/reviews/{{$parameter["review"].split("reviews/").pop().split("/reply")[0]}}/reply',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorsDeleteReply],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get review',
				description: 'Retrieve details of a specific review on Google Business Profile',
				routing: {
					request: {
						method: 'GET',
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/reviews/{{$parameter["review"].split("reviews/").pop().split("/reply")[0]}}',
						ignoreHttpStatusErrors: true,
					},

					output: {
						postReceive: [handleErrorsGetReview],
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
							pageSize:
								'={{ $parameter["limit"] ? ($parameter["limit"] < 50 ? $parameter["limit"] : 50) : 50 }}', // Google allows maximum 50 results per page
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
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/reviews/{{$parameter["review"].split("reviews/").pop().split("/reply")[0]}}/reply',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorsReplyToReview],
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
		default: { mode: 'list', value: '' },
		description: 'The Google Business Profile account',
		displayOptions: { show: { resource: ['review'], operation: ['get'] } },
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchAccounts',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'name',
				type: 'string',
				hint: 'Enter the account name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+',
							errorMessage: 'The name must start with "accounts/"',
						},
					},
				],
				placeholder: 'e.g. accounts/0123456789',
			},
		],
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The specific location or business associated with the account',
		displayOptions: { show: { resource: ['review'], operation: ['get'] } },
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchLocations',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'name',
				type: 'string',
				hint: 'Enter the location name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'locations/[0-9]+',
							errorMessage: 'The name must start with "locations/"',
						},
					},
				],
				placeholder: 'e.g. locations/0123456789',
			},
		],
	},
	{
		displayName: 'Review',
		name: 'review',
		required: true,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Select the review to retrieve its details',
		displayOptions: { show: { resource: ['review'], operation: ['get'] } },
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchReviews',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^(?!accounts/[0-9]+/locations/[0-9]+/reviews/).*',
							errorMessage: 'The name must not start with "accounts/123/locations/123/reviews/"',
						},
					},
				],
				placeholder: 'e.g. ABC123_review-ID_456xyz',
			},
			{
				displayName: 'By name',
				name: 'name',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+/locations/[0-9]+/reviews/.*$',
							errorMessage: 'The name must start with "accounts/123/locations/123/reviews/"',
						},
					},
				],
				placeholder: 'e.g. accounts/123/locations/123/reviews/ABC123_review-ID_456xyz',
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
		default: { mode: 'list', value: '' },
		description: 'The Google Business Profile account',
		displayOptions: { show: { resource: ['review'], operation: ['delete'] } },
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchAccounts',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'name',
				type: 'string',
				hint: 'Enter the account name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+',
							errorMessage: 'The name must start with "accounts/"',
						},
					},
				],
				placeholder: 'e.g. accounts/0123456789',
			},
		],
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The specific location or business associated with the account',
		displayOptions: { show: { resource: ['review'], operation: ['delete'] } },
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchLocations',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'name',
				type: 'string',
				hint: 'Enter the location name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'locations/[0-9]+',
							errorMessage: 'The name must start with "locations/"',
						},
					},
				],
				placeholder: 'e.g. locations/0123456789',
			},
		],
	},
	{
		displayName: 'Review',
		name: 'review',
		required: true,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Select the review to retrieve its details',
		displayOptions: { show: { resource: ['review'], operation: ['delete'] } },
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchReviews',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^(?!accounts/[0-9]+/locations/[0-9]+/reviews/).*',
							errorMessage: 'The name must not start with "accounts/123/locations/123/reviews/"',
						},
					},
				],
				placeholder: 'e.g. ABC123_review-ID_456xyz',
			},
			{
				displayName: 'By name',
				name: 'name',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+/locations/[0-9]+/reviews/.*$',
							errorMessage: 'The name must start with "accounts/123/locations/123/reviews/"',
						},
					},
				],
				placeholder: 'e.g. accounts/123/locations/123/reviews/ABC123_review-ID_456xyz',
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
		default: { mode: 'list', value: '' },
		description: 'The Google Business Profile account',
		displayOptions: { show: { resource: ['review'], operation: ['getAll'] } },
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchAccounts',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'name',
				type: 'string',
				hint: 'Enter the account name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+',
							errorMessage: 'The name must start with "accounts/"',
						},
					},
				],
				placeholder: 'e.g. accounts/0123456789',
			},
		],
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The specific location or business associated with the account',
		displayOptions: { show: { resource: ['review'], operation: ['getAll'] } },
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchLocations',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'name',
				type: 'string',
				hint: 'Enter the location name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'locations/[0-9]+',
							errorMessage: 'The name must start with "locations/"',
						},
					},
				],
				placeholder: 'e.g. locations/0123456789',
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['review'], operation: ['getAll'] } },
		type: 'boolean',
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
		displayOptions: { show: { resource: ['review'], operation: ['getAll'], returnAll: [false] } },
	},

	/* -------------------------------------------------------------------------- */
	/*                                 review:reply                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The Google Business Profile account',
		displayOptions: { show: { resource: ['review'], operation: ['reply'] } },
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchAccounts',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'name',
				type: 'string',
				hint: 'Enter the account name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+',
							errorMessage: 'The name must start with "accounts/"',
						},
					},
				],
				placeholder: 'e.g. accounts/0123456789',
			},
		],
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The specific location or business associated with the account',
		displayOptions: { show: { resource: ['review'], operation: ['reply'] } },
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchLocations',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'name',
				type: 'string',
				hint: 'Enter the location name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'locations/[0-9]+',
							errorMessage: 'The name must start with "locations/"',
						},
					},
				],
				placeholder: 'e.g. locations/0123456789',
			},
		],
	},
	{
		displayName: 'Review',
		name: 'review',
		required: true,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Select the review to retrieve its details',
		displayOptions: { show: { resource: ['review'], operation: ['reply'] } },
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchReviews',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^(?!accounts/[0-9]+/locations/[0-9]+/reviews/).*',
							errorMessage: 'The name must not start with "accounts/123/locations/123/reviews/"',
						},
					},
				],
				placeholder: 'e.g. ABC123_review-ID_456xyz',
			},
			{
				displayName: 'By name',
				name: 'name',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+/locations/[0-9]+/reviews/.*$',
							errorMessage: 'The name must start with "accounts/123/locations/123/reviews/"',
						},
					},
				],
				placeholder: 'e.g. accounts/123/locations/123/reviews/ABC123_review-ID_456xyz',
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
