import type { INodeProperties } from 'n8n-workflow';
import { getAllPostsPostReceive, handleDatesPresend } from './GenericFunctions';

export const postOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		noDataExpression: true,
		displayOptions: { show: { resource: ['post'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create post',
				description: 'Create a new post on Google My Business',
				routing: {
					send: { preSend: [handleDatesPresend] },
					request: {
						method: 'POST',
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/localPosts',
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
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/{{$parameter["post"]}}',
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
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/{{$parameter["post"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many posts',
				description: 'Retrieve multiple posts',
				routing: {
					output: { postReceive: [getAllPostsPostReceive] },
					request: {
						method: 'GET',
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/localPosts',
						qs: {
							pageSize: '={{$parameter["limit"]<100 ? $parameter["limit"] : 100}}', // ToDo
						},
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a post',
				description: 'Update an existing post',
				routing: {
					send: { preSend: [handleDatesPresend] },
					request: {
						method: 'PATCH',
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/{{$parameter["post"]}}',
					},
				},
			},
		],
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
		default: '',
		description: 'The Google My Business account name',
		placeholder: 'accounts/012345678901234567890',
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'string',
		default: '',
		description: 'The specific location or business associated with the account',
		placeholder: 'locations/012345678901234567',
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
	},
	{
		displayName: 'Post Type',
		name: 'postType',
		required: true,
		type: 'options',
		default: 'STANDARD',
		description: 'The type of post to create (standard, event, offer, or alert)',
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'topicType' } },
		options: [
			{
				name: 'Standard',
				value: 'STANDARD',
			},
			{
				name: 'Event',
				value: 'EVENT',
			},
			{
				name: 'Offer',
				value: 'OFFER',
			},
			{
				name: 'Alert',
				value: 'ALERT',
			},
		],
	},
	{
		displayName: 'Summary',
		name: 'summary',
		required: true,
		type: 'string',
		default: '',
		description: 'The main text of the post',
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'summary' } },
	},
	{
		displayName: 'Options',
		name: 'additionalOptions',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
		options: [
			{
				displayName: 'Language',
				name: 'languageCode',
				type: 'string',
				default: '',
				description: 'The language of the post content',
				routing: { send: { type: 'body', property: 'languageCode' } },
			},
			{
				displayName: 'Call to Action Type',
				name: 'actionType',
				type: 'options',
				default: 'ACTION_TYPE_UNSPECIFIED',
				description: 'The type of call to action',
				displayOptions: { show: { '/postType': ['STANDARD', 'EVENT', 'ALERT'] } },
				routing: { send: { type: 'body', property: 'callToAction.actionType' } },
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
				displayOptions: { show: { '/postType': ['STANDARD', 'EVENT', 'ALERT'] } },
				routing: { send: { type: 'body', property: 'callToAction.url' } },
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'E.g. Sales this week.',
				displayOptions: { show: { '/postType': ['EVENT'] } },
				routing: { send: { type: 'body', property: 'event.title' } },
			},
			{
				displayName: 'Start Date and Time',
				name: 'startDateTime',
				type: 'dateTime',
				default: '',
				description: 'The start date and time of the event',
				displayOptions: { show: { '/postType': ['EVENT'] } },
			},
			{
				displayName: 'End Date and Time',
				name: 'endDateTime',
				type: 'dateTime',
				default: '',
				description: 'The end date and time of the event',
				displayOptions: { show: { '/postType': ['EVENT'] } },
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'E.g. 20% off in store or online.',
				displayOptions: { show: { '/postType': ['OFFER'] } },
				routing: { send: { type: 'body', property: 'event.title' } },
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'string', // ToDo: Can dateTime be used?
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'The start date of the offer',
				displayOptions: { show: { '/postType': ['OFFER'] } },
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'string', // ToDo: Can dateTime be used?
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'The end date of the offer',
				displayOptions: { show: { '/postType': ['OFFER'] } },
				typeOptions: { useDateAndTime: false },
			},
			{
				displayName: 'Coupon Code',
				name: 'couponCode',
				type: 'string',
				default: '',
				description: 'The coupon code for the offer',
				displayOptions: { show: { '/postType': ['OFFER'] } },
				routing: { send: { type: 'body', property: 'offer.couponCode' } },
			},
			{
				displayName: 'Redeem Online Url',
				name: 'redeemOnlineUrl',
				type: 'string',
				default: '',
				description: 'Link to redeem the offer',
				displayOptions: { show: { '/postType': ['OFFER'] } },
				routing: { send: { type: 'body', property: 'offer.redeemOnlineUrl' } },
			},
			{
				displayName: 'Terms and Conditions',
				name: 'termsAndConditions',
				type: 'string',
				default: '',
				description: 'The terms and conditions of the offer',
				displayOptions: { show: { '/postType': ['OFFER'] } },
				routing: { send: { type: 'body', property: 'offer.termsAndConditions' } },
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 post:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'string',
		default: '',
		description: 'The Google My Business account name',
		placeholder: 'accounts/012345678901234567890',
		displayOptions: { show: { resource: ['post'], operation: ['delete'] } },
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'string',
		default: '',
		description: 'The specific location or business associated with the account',
		placeholder: 'locations/012345678901234567',
		displayOptions: { show: { resource: ['post'], operation: ['delete'] } },
	},
	{
		displayName: 'Post',
		name: 'post',
		type: 'string',
		default: '',
		description: 'Select the post by name or URL to retrieve its details',
		displayOptions: { show: { resource: ['post'], operation: ['delete'] } },
		typeOptions: { loadOptionsMethod: 'getPosts' },
	},

	/* -------------------------------------------------------------------------- */
	/*                                 post:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'string',
		default: '',
		description: 'The Google My Business account name',
		placeholder: 'accounts/012345678901234567890',
		displayOptions: { show: { resource: ['post'], operation: ['get'] } },
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'string',
		default: '',
		description: 'The specific location or business associated with the account',
		placeholder: 'locations/012345678901234567',
		displayOptions: { show: { resource: ['post'], operation: ['get'] } },
	},
	{
		displayName: 'Post',
		name: 'post',
		type: 'string',
		default: '',
		description: 'Select the post by name or URL to retrieve its details',
		displayOptions: { show: { resource: ['post'], operation: ['get'] } },
		typeOptions: { loadOptionsMethod: 'getPosts' },
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
		placeholder: 'accounts/012345678901234567890',
		displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
		default: '',
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'string',
		default: '',
		description: 'The specific location or business associated with the account',
		placeholder: 'locations/012345678901234567',
		displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 100, // ToDo: Remove after pagination is implemented
		},
		default: 20,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: false,
		description:
			'Whether the response to include only the name, URL, and call-to-action button fields',
		displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
	},

	/* -------------------------------------------------------------------------- */
	/*                                 post:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'string',
		default: '',
		description: 'The Google My Business account name',
		placeholder: 'accounts/012345678901234567890',
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'string',
		default: '',
		description: 'The specific location or business associated with the account',
		placeholder: 'locations/012345678901234567',
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
	},
	{
		displayName: 'Post',
		name: 'post',
		type: 'string',
		default: '',
		description: 'Select the post by name or URL to retrieve its details',
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
		typeOptions: { loadOptionsMethod: 'getPosts' },
	},
	{
		displayName: 'Post Type',
		name: 'postType',
		required: true,
		type: 'options',
		default: 'STANDARD',
		description: 'The type of post to create (standard, event, offer, or alert)',
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
		routing: { send: { type: 'body', property: 'topicType' } },
		options: [
			{
				name: 'Standard',
				value: 'STANDARD',
			},
			{
				name: 'Event',
				value: 'EVENT',
			},
			{
				name: 'Offer',
				value: 'OFFER',
			},
			{
				name: 'Alert',
				value: 'ALERT',
			},
		],
	},
	{
		displayName: 'Summary',
		name: 'summary',
		required: true,
		type: 'string',
		default: '',
		description: 'The main text of the post',
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
		routing: { send: { type: 'body', property: 'summary' } },
	},
	{
		displayName: 'Options',
		name: 'additionalOptions',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
		options: [
			{
				displayName: 'Language',
				name: 'languageCode',
				type: 'string',
				default: '',
				description: 'The language of the post content',
				routing: { send: { type: 'body', property: 'languageCode' } },
			},
			{
				displayName: 'Call to Action Type',
				name: 'actionType',
				type: 'options',
				default: 'ACTION_TYPE_UNSPECIFIED',
				description: 'The type of call to action',
				displayOptions: { show: { '/postType': ['STANDARD', 'EVENT', 'ALERT'] } },
				routing: { send: { type: 'body', property: 'callToAction.actionType' } },
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
				displayOptions: { show: { '/postType': ['STANDARD', 'EVENT', 'ALERT'] } },
				routing: { send: { type: 'body', property: 'callToAction.url' } },
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'E.g. Sales this week.',
				displayOptions: { show: { '/postType': ['EVENT'] } },
				routing: { send: { type: 'body', property: 'event.title' } },
			},
			{
				displayName: 'Start Date and Time',
				name: 'startDateTime',
				type: 'dateTime',
				default: '',
				description: 'The start date and time of the event',
				displayOptions: { show: { '/postType': ['EVENT'] } },
			},
			{
				displayName: 'End Date and Time',
				name: 'endDateTime',
				type: 'dateTime',
				default: '',
				description: 'The end date and time of the event',
				displayOptions: { show: { '/postType': ['EVENT'] } },
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'E.g. 20% off in store or online.',
				displayOptions: { show: { '/postType': ['OFFER'] } },
				routing: { send: { type: 'body', property: 'event.title' } },
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'string', // ToDo: Can dateTime be used?
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'The start date of the offer',
				displayOptions: { show: { '/postType': ['OFFER'] } },
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'string', // ToDo: Can dateTime be used?
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'The end date of the offer',
				displayOptions: { show: { '/postType': ['OFFER'] } },
				typeOptions: { useDateAndTime: false },
			},
			{
				displayName: 'Coupon Code',
				name: 'couponCode',
				type: 'string',
				default: '',
				description: 'The coupon code for the offer',
				displayOptions: { show: { '/postType': ['OFFER'] } },
				routing: { send: { type: 'body', property: 'offer.couponCode' } },
			},
			{
				displayName: 'Redeem Online Url',
				name: 'redeemOnlineUrl',
				type: 'string',
				default: '',
				description: 'Link to redeem the offer',
				displayOptions: { show: { '/postType': ['OFFER'] } },
				routing: { send: { type: 'body', property: 'offer.redeemOnlineUrl' } },
			},
			{
				displayName: 'Terms and Conditions',
				name: 'termsAndConditions',
				type: 'string',
				default: '',
				description: 'The terms and conditions of the offer',
				displayOptions: { show: { '/postType': ['OFFER'] } },
				routing: { send: { type: 'body', property: 'offer.termsAndConditions' } },
			},
		],
	},
];
