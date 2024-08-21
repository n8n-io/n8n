import type { INodeProperties } from 'n8n-workflow';
import { createPostPresend } from './GenericFunctions';

export const postOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['post'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create post',
				description: 'Create a new post on Google My Business',
				routing: {
					send: { preSend: [createPostPresend] },
					request: {
						method: 'POST',
						url: '=/{{account}}/{{location}}/localPosts',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete post',
				description: 'Delete an existing post',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/{{account}}/{{location}}/{{post}}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get post',
				description: 'Retrieve details of a specific post',
				routing: {
					request: {
						method: 'GET',
						url: '=/{{account}}/{{location}}/{{post}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many posts',
				description: 'Retrieve multiple posts',
				routing: {
					request: {
						method: 'GET',
						url: '=/{{account}}/{{location}}/localPosts',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a post',
				description: 'Update an existing post',
				routing: {
					request: {
						method: 'GET',
						url: '=/{{account}}/{{location}}/{{post}}',
					},
				},
			},
		],
		default: 'create',
	},
];

export const postFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 post:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'string',
		description: 'The Google My Business account name',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['post'],
			},
		},
		default: '',
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'string',
		default: '',
		description: 'The specific location or business associated with the account',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['post'],
			},
		},
	},
	{
		displayName: 'Post Type',
		name: 'postType',
		required: true,
		type: 'options',
		default: 'standard',
		description: 'The type of post to create (standard, event, offer, or alert)',
		options: [
			{
				name: 'Standard',
				value: 'standard',
			},
			{
				name: 'Event',
				value: 'event',
			},
			{
				name: 'Offer',
				value: 'offer',
			},
			{
				name: 'Alert',
				value: 'alert',
			},
		],
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['post'],
			},
		},
	},
	{
		displayName: 'Summary',
		name: 'summary',
		required: true,
		type: 'string',
		default: '',
		description: 'The main text of the post',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['post'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['post'],
			},
		},
		options: [
			{
				displayName: 'Language',
				name: 'languageCode',
				type: 'string',
				default: '',
				description: 'The language of the post content',
			},
			{
				displayName: 'Call to Action Type',
				name: 'actionType',
				type: 'options',
				default: 'ACTION_TYPE_UNSPECIFIED',
				description: 'The type of call to action',
				displayOptions: {
					show: {
						'/postType': ['standard', 'event', 'offer', 'alert'],
					},
				},
				options: [
					{
						name: 'Action Type Unspecified',
						value: 'ACTION_TYPE_UNSPECIFIED',
						description: 'Type unspecified',
					},
					{
						name: 'Book',
						value: 'BOOK',
						description: 'This post wants a user to book an appointment/table/etc',
					},
					{
						name: 'Get Offer',
						value: 'GET_OFFER',
						description:
							'Deprecated. Use OFFER in LocalPostTopicType to create a post with offer content.',
					},
					{
						name: 'Learn More',
						value: 'LEARN_MORE',
						description: 'This post wants a user to learn more (at their website)',
					},
					{
						name: 'Order',
						value: 'ORDER',
						description: 'This post wants a user to order something',
					},
					{
						name: 'Shop',
						value: 'SHOP',
						description: 'This post wants a user to browse a product catalog',
					},
					{
						name: 'Sign Up',
						value: 'SIGN_UP',
						description: 'This post wants a user to register/sign up/join something',
					},
				],
			},
			{
				displayName: 'Call to Action Url',
				name: 'url',
				type: 'string',
				default: '',
				description: 'The URL that users are sent to when clicking through the promotion',
				displayOptions: {
					show: {
						'/postType': ['standard', 'event', 'offer', 'alert'],
					},
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'E.g. Sales this week.',
				displayOptions: {
					show: {
						'/postType': ['event'],
					},
				},
			},
			{
				displayName: 'Start Date and Time',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'The start date and time of the event',
				displayOptions: {
					show: {
						'/postType': ['event'],
					},
				},
			},
			{
				displayName: 'End Date and Time',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description: 'The end date and time of the event',
				displayOptions: {
					show: {
						'/postType': ['event'],
					},
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'E.g. 20% off in store or online.',
				displayOptions: {
					show: {
						'/postType': ['offer'],
					},
				},
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'The start date of the offer',
				displayOptions: {
					show: {
						'/postType': ['offer'],
					},
				},
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description: 'The end date of the offer',
				displayOptions: {
					show: {
						'/postType': ['offer'],
					},
				},
			},
			{
				displayName: 'Coupon Code',
				name: 'couponCode',
				type: 'string',
				default: '',
				description: 'The coupon code for the offer',
				displayOptions: {
					show: {
						'/postType': ['offer'],
					},
				},
			},
			{
				displayName: 'Redeem Online Url',
				name: 'redeemOnlineUrl',
				type: 'string',
				default: '',
				description: 'Link to redeem the offer',
				displayOptions: {
					show: {
						'/postType': ['offer'],
					},
				},
			},
			{
				displayName: 'Terms and Conditions',
				name: 'termsAndConditions',
				type: 'string',
				default: '',
				description: 'The terms and conditions of the offer',
				displayOptions: {
					show: {
						'/postType': ['offer'],
					},
				},
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 post:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Post',
		name: 'post',
		type: 'string',
		default: '',
		description: 'Select the post by name or URL to retrieve its details',
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['post'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getPosts',
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 post:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Post',
		name: 'post',
		type: 'string',
		default: '',
		description: 'Select the post by name or URL to retrieve its details',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['post'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getPosts',
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 post:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'string',
		description: 'The Google My Business account name',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['post'],
			},
		},
		default: '',
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'string',
		default: '',
		description: 'The specific location or business associated with the account',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['post'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 20,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['post'],
			},
		},
	},
	// ToDo: Simplify (if it makes sense)
	// {
	// 	displayName: 'Simplify',
	// 	name: 'simplify',
	// 	type: 'boolean',
	// 	default: false,
	// 	description:
	// 		'Whether the response to include only the name, URL, and call-to-action button fields',
	// 	displayOptions: {
	// 		show: {
	// 			operation: ['getAll'],
	// 			resource: ['post'],
	// 		},
	// 	},
	// },

	/* -------------------------------------------------------------------------- */
	/*                                 post:update                                */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'string',
		description: 'The Google My Business account name',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['post'],
			},
		},
		default: '',
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'string',
		default: '',
		description: 'The specific location or business associated with the account',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['post'],
			},
		},
	},
	{
		displayName: 'Post',
		name: 'post',
		type: 'string',
		default: '',
		description: 'Select the post by name or URL to retrieve its details',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['post'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getPosts',
		},
	},

	// TODO
	// 	Parameters:
	// 			Same as create but with the Resource Locator Component to select the post.
];
