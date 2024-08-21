import type { INodeProperties } from 'n8n-workflow';
import { getAllReviewsPostReceive, replyToReviewPreSend } from './GenericFunctions';

export const reviewOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['review'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get review',
				description: 'Retrieve details of a specific review on Google My Business',
				routing: {
					request: {
						method: 'GET',
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/{{$parameter["review"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many reviews',
				description: 'Retrieve multiple reviews',
				routing: {
					output: { postReceive: [getAllReviewsPostReceive] },
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
					send: { preSend: [replyToReviewPreSend] },
					request: {
						method: 'PUT',
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/{{$parameter["review"]}}/reply',
					},
				},
			},
		],
		default: 'get',
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
		type: 'string',
		default: '',
		description: 'The Google My Business account name',
		placeholder: 'accounts/012345678901234567890',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['review'],
			},
		},
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'string',
		default: '',
		description: 'The specific location or business associated with the account',
		placeholder: 'locations/012345678901234567',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['review'],
			},
		},
	},
	{
		displayName: 'Review',
		name: 'location',
		type: 'string',
		default: '',
		description: 'Select the post by name or URL to retrieve its details',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['review'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getReviews',
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 review:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'string',
		default: '',
		description: 'The Google My Business account name',
		placeholder: 'accounts/012345678901234567890',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['review'],
			},
		},
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'string',
		default: '',
		description: 'The specific location or business associated with the account',
		placeholder: 'locations/012345678901234567',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['review'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		required: true,
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 50,
		},
		default: 20,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['review'],
			},
		},
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: false,
		description:
			'Whether the response to include only the name, URL, and call-to-action button fields',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['review'],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 review:reply                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'string',
		default: '',
		description: 'The Google My Business account name',
		placeholder: 'accounts/012345678901234567890',
		displayOptions: {
			show: {
				operation: ['reply'],
				resource: ['review'],
			},
		},
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'string',
		default: '',
		description: 'The specific location or business associated with the account',
		placeholder: 'locations/012345678901234567',
		displayOptions: {
			show: {
				operation: ['reply'],
				resource: ['review'],
			},
		},
	},
	{
		displayName: 'Review Name',
		name: 'reviewName',
		type: 'string',
		default: '',
		description: 'Select the post by name or URL to retrieve its details',
		displayOptions: {
			show: {
				operation: ['reply'],
				resource: ['review'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getReviews',
		},
	},
	{
		displayName: 'Reply',
		name: 'comment',
		type: 'string',
		default: '',
		description: 'The body of the reply (up to 4096 characters)',
		displayOptions: {
			show: {
				operation: ['reply'],
				resource: ['review'],
			},
		},
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
	},
];
