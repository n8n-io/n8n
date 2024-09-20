import type { INodeProperties } from 'n8n-workflow';
import { addUpdateMask, handleDatesPresend, handlePagination } from './GenericFunctions';

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
						url: '=//{{$parameter["post"]}}',
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
						url: '=/{{$parameter["post"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many posts',
				description: 'Retrieve multiple posts',
				routing: {
					send: { paginate: true },
					operations: { pagination: handlePagination },
					request: {
						method: 'GET',
						url: '=/{{$parameter["account"]}}/{{$parameter["location"]}}/localPosts',
						qs: {
							pageSize: '={{$parameter["limit"]<100 ? $parameter["limit"] : 100}}', // Google allows maximum 100 results per page
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
					send: { preSend: [handleDatesPresend, addUpdateMask] },
					request: {
						method: 'PATCH',
						url: '=/{{$parameter["post"]}}',
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
		type: 'resourceLocator',
		default: '',
		description: 'The Google My Business account',
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
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
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
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
				routing: {
					send: { type: 'body', property: 'callToAction.actionType' },
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
						name: 'Call',
						value: 'CALL',
						description: 'This post wants a user to call the business',
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
				routing: {
					send: { type: 'body', property: 'callToAction.url' },
				},
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
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'The start date of the offer',
				displayOptions: { show: { '/postType': ['OFFER'] } },
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'string',
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
				routing: {
					send: { type: 'body', property: 'offer.couponCode' },
				},
			},
			{
				displayName: 'Redeem Online Url',
				name: 'redeemOnlineUrl',
				type: 'string',
				default: '',
				description: 'Link to redeem the offer',
				displayOptions: { show: { '/postType': ['OFFER'] } },
				routing: {
					send: { type: 'body', property: 'offer.redeemOnlineUrl' },
				},
			},
			{
				displayName: 'Terms and Conditions',
				name: 'termsAndConditions',
				type: 'string',
				default: '',
				description: 'The terms and conditions of the offer',
				displayOptions: { show: { '/postType': ['OFFER'] } },
				routing: {
					send: { type: 'body', property: 'offer.termsAndConditions' },
				},
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
		type: 'resourceLocator',
		default: '',
		description: 'The Google My Business account',
		displayOptions: { show: { resource: ['post'], operation: ['delete'] } },
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
		displayOptions: { show: { resource: ['post'], operation: ['delete'] } },
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
		displayName: 'Post',
		name: 'post',
		type: 'resourceLocator',
		default: '',
		description: 'Select the post by name or URL to retrieve its details',
		displayOptions: { show: { resource: ['post'], operation: ['delete'] } },
		modes: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the post ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+/locations/[0-9]+/localPosts/[0-9]+',
							errorMessage:
								'The ID must be in the format "localPosts/123/locations/123/localPosts/123"',
						},
					},
				],
				placeholder: 'accounts/0123456789/locations/0123456789/localPosts/0123456789',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchPosts',
					searchable: true,
				},
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 post:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'resourceLocator',
		default: '',
		description: 'The Google My Business account',
		displayOptions: { show: { resource: ['post'], operation: ['get'] } },
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
		displayOptions: { show: { resource: ['post'], operation: ['get'] } },
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
		displayName: 'Post',
		name: 'post',
		type: 'resourceLocator',
		default: '',
		description: 'Select the post by name or URL to retrieve its details',
		displayOptions: { show: { resource: ['post'], operation: ['get'] } },
		modes: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the post ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+/locations/[0-9]+/localPosts/[0-9]+',
							errorMessage:
								'The ID must be in the format "localPosts/123/locations/123/localPosts/123"',
						},
					},
				],
				placeholder: 'accounts/0123456789/locations/0123456789/localPosts/0123456789',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchPosts',
					searchable: true,
				},
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 post:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'resourceLocator',
		default: '',
		description: 'The Google My Business account',
		displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
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
		displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
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
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 20,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
	},

	/* -------------------------------------------------------------------------- */
	/*                                 post:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'resourceLocator',
		default: '',
		description: 'The Google My Business account',
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
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
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
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
		displayName: 'Post',
		name: 'post',
		type: 'resourceLocator',
		default: '',
		description: 'Select the post by ID or URL to retrieve its details',
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
		modes: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter the post ID',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+/locations/[0-9]+/localPosts/[0-9]+',
							errorMessage:
								'The ID must be in the format "localPosts/123/locations/123/localPosts/123"',
						},
					},
				],
				placeholder: 'accounts/0123456789/locations/0123456789/localPosts/0123456789',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchPosts',
					searchable: true,
				},
			},
		],
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
				displayName: 'Post Type',
				name: 'postType',
				type: 'options',
				default: 'STANDARD',
				description: 'The type of post to create (standard, event, offer, or alert)',
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
				type: 'string',
				default: '',
				description: 'The main text of the post',
				routing: { send: { type: 'body', property: 'summary' } },
			},
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
				displayOptions: { show: { postType: ['STANDARD', 'EVENT', 'ALERT'] } }, // ToDo: issue with displayOptions + routing. Tried also './postType'
				routing: {
					send: { type: 'body', property: 'callToAction.actionType' },
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
				displayOptions: { show: { postType: ['STANDARD', 'EVENT', 'ALERT'] } }, // ToDo: issue with displayOptions + routing. Tried also './postType'
				routing: {
					send: { type: 'body', property: 'callToAction.url' },
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'E.g. Sales this week.',
				displayOptions: { show: { postType: ['EVENT'] } }, // ToDo: issue with displayOptions + routing. Tried also './postType'
				routing: { send: { type: 'body', property: 'event.title' } },
			},
			{
				displayName: 'Start Date and Time',
				name: 'startDateTime',
				type: 'dateTime',
				default: '',
				description: 'The start date and time of the event',
				displayOptions: { show: { postType: ['EVENT'] } }, // ToDo: issue with displayOptions + routing. Tried also './postType'
			},
			{
				displayName: 'End Date and Time',
				name: 'endDateTime',
				type: 'dateTime',
				default: '',
				description: 'The end date and time of the event',
				displayOptions: { show: { postType: ['EVENT'] } }, // ToDo: issue with displayOptions + routing. Tried also './postType'
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'E.g. 20% off in store or online.',
				displayOptions: { show: { postType: ['OFFER'] } }, // ToDo: issue with displayOptions + routing. Tried also './postType'
				routing: { send: { type: 'body', property: 'event.title' } },
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'The start date of the offer',
				displayOptions: { show: { postType: ['OFFER'] } }, // ToDo: issue with displayOptions + routing. Tried also './postType'
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'The end date of the offer',
				displayOptions: { show: { postType: ['OFFER'] } }, // ToDo: issue with displayOptions + routing. Tried also './postType'
			},
			{
				displayName: 'Coupon Code',
				name: 'couponCode',
				type: 'string',
				default: '',
				description: 'The coupon code for the offer',
				displayOptions: { show: { postType: ['OFFER'] } }, // ToDo: issue with displayOptions + routing. Tried also './postType'
				routing: {
					send: { type: 'body', property: 'offer.couponCode' },
				},
			},
			{
				displayName: 'Redeem Online Url',
				name: 'redeemOnlineUrl',
				type: 'string',
				default: '',
				description: 'Link to redeem the offer',
				displayOptions: { show: { postType: ['OFFER'] } }, // ToDo: issue with displayOptions + routing. Tried also './postType'
				routing: {
					send: { type: 'body', property: 'offer.redeemOnlineUrl' },
				},
			},
			{
				displayName: 'Terms and Conditions',
				name: 'termsAndConditions',
				type: 'string',
				default: '',
				description: 'The terms and conditions of the offer',
				displayOptions: { show: { postType: ['OFFER'] } }, // ToDo: issue with displayOptions + routing. Tried also './postType'
				routing: {
					send: { type: 'body', property: 'offer.termsAndConditions' },
				},
			},
		],
	},
];
