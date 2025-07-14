import type { INodeProperties } from 'n8n-workflow';

import {
	addUpdateMaskPresend,
	handleDatesPresend,
	handleErrorsDeletePost,
	handleErrorsGetPost,
	handleErrorsUpdatePost,
	handlePagination,
} from './GenericFunctions';

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
				description: 'Create a new post on Google Business Profile',
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
						url: '=/{{$parameter["post"]}}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorsDeletePost],
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
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorsGetPost],
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
							pageSize:
								'={{ $parameter["limit"] ? ($parameter["limit"] < 100 ? $parameter["limit"] : 100) : 100 }}', // Google allows maximum 100 results per page
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
					send: {
						preSend: [handleDatesPresend, addUpdateMaskPresend],
					},
					request: {
						method: 'PATCH',
						url: '=/{{$parameter["post"]}}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleErrorsUpdatePost],
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
		default: { mode: 'list', value: '' },
		description: 'The Google Business Profile account',
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
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
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
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
		displayName: 'Title',
		name: 'title',
		required: true,
		type: 'string',
		default: '',
		description: 'E.g. Sales this week.',
		displayOptions: { show: { resource: ['post'], operation: ['create'], postType: ['EVENT'] } },
		routing: { send: { type: 'body', property: 'event.title' } },
	},
	{
		displayName: 'Start Date and Time',
		name: 'startDateTime',
		required: true,
		type: 'dateTime',
		default: '',
		description: 'The start date and time of the event',
		displayOptions: { show: { resource: ['post'], operation: ['create'], postType: ['EVENT'] } },
	},
	{
		displayName: 'End Date and Time',
		name: 'endDateTime',
		required: true,
		type: 'dateTime',
		default: '',
		description: 'The end date and time of the event',
		displayOptions: { show: { resource: ['post'], operation: ['create'], postType: ['EVENT'] } },
	},
	{
		displayName: 'Title',
		name: 'title',
		required: true,
		type: 'string',
		default: '',
		description: 'E.g. 20% off in store or online.',
		displayOptions: { show: { resource: ['post'], operation: ['create'], postType: ['OFFER'] } },
		routing: { send: { type: 'body', property: 'event.title' } },
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		required: true,
		type: 'string',
		default: '',
		placeholder: 'YYYY-MM-DD',
		description: 'The start date of the offer',
		displayOptions: { show: { resource: ['post'], operation: ['create'], postType: ['OFFER'] } },
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		required: true,
		type: 'string',
		default: '',
		placeholder: 'YYYY-MM-DD',
		description: 'The end date of the offer',
		displayOptions: { show: { resource: ['post'], operation: ['create'], postType: ['OFFER'] } },
	},
	{
		displayName: 'Alert Type',
		name: 'alertType',
		required: true,
		type: 'options',
		default: 'COVID_19',
		description: 'The sub-type of the alert',
		displayOptions: { show: { resource: ['post'], operation: ['create'], postType: ['ALERT'] } },
		routing: {
			send: { type: 'body', property: 'alertType' },
		},
		options: [
			{
				name: 'Covid 19',
				value: 'COVID_19',
				description: 'This alert is related to the 2019 Coronavirus Disease pandemic',
			},
		],
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
				placeholder: 'e.g. en',
				description:
					'The language code of the post content. <a href="https://cloud.google.com/translate/docs/languages" target="_blank">More info</a>.',
				routing: { send: { type: 'body', property: 'languageCode' } },
			},
			{
				displayName: 'Call to Action Type',
				name: 'callToActionType',
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
				name: 'termsConditions',
				type: 'string',
				default: '',
				description: 'The terms and conditions of the offer',
				displayOptions: { show: { '/postType': ['OFFER'] } },
				routing: {
					send: { type: 'body', property: 'offer.termsConditions' },
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
		default: { mode: 'list', value: '' },
		description: 'The Google Business Profile account',
		displayOptions: { show: { resource: ['post'], operation: ['delete'] } },
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
		displayOptions: { show: { resource: ['post'], operation: ['delete'] } },
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
		displayName: 'Post',
		name: 'post',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Select the post to retrieve its details',
		displayOptions: { show: { resource: ['post'], operation: ['delete'] } },
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchPosts',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'name',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+/locations/[0-9]+/localPosts/[0-9]+',
							errorMessage:
								'The name must be in the format "accounts/123/locations/123/localPosts/123"',
						},
					},
				],
				placeholder: 'e.g. accounts/123/locations/123/localPosts/123',
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
		default: { mode: 'list', value: '' },
		description: 'The Google Business Profile account',
		displayOptions: { show: { resource: ['post'], operation: ['get'] } },
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
		displayOptions: { show: { resource: ['post'], operation: ['get'] } },
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
		displayName: 'Post',
		name: 'post',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Select the post to retrieve its details',
		displayOptions: { show: { resource: ['post'], operation: ['get'] } },
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchPosts',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'name',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+/locations/[0-9]+/localPosts/[0-9]+',
							errorMessage:
								'The name must be in the format "accounts/123/locations/123/localPosts/123"',
						},
					},
				],
				placeholder: 'e.g. accounts/123/locations/123/localPosts/123',
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
		default: { mode: 'list', value: '' },
		description: 'The Google Business Profile account',
		displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
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
		displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
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
		displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
		type: 'boolean',
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
		displayOptions: { show: { resource: ['post'], operation: ['getAll'], returnAll: [false] } },
	},

	/* -------------------------------------------------------------------------- */
	/*                                 post:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The Google Business Profile account',
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
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
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
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
		displayName: 'Post',
		name: 'post',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Select the post to retrieve its details',
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchPosts',
					searchable: true,
				},
			},
			{
				displayName: 'By name',
				name: 'name',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'accounts/[0-9]+/locations/[0-9]+/localPosts/[0-9]+',
							errorMessage:
								'The name must be in the format "accounts/123/locations/123/localPosts/123"',
						},
					},
				],
				placeholder: 'e.g. accounts/123/locations/123/localPosts/123',
			},
		],
	},
	{
		displayName:
			"Make sure that the updated options are supported by the post type. <a target='_blank' href='https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts#resource:-localpost'>More info</a>.",
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
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
				placeholder: 'e.g. en',
				description:
					'The language code of the post content. <a href="https://cloud.google.com/translate/docs/languages" target="_blank">More info</a>.',
				routing: { send: { type: 'body', property: 'languageCode' } },
			},
			{
				displayName: 'Call to Action Type',
				name: 'callToActionType',
				type: 'options',
				default: 'ACTION_TYPE_UNSPECIFIED',
				description: 'The type of call to action',
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
				routing: {
					send: { type: 'body', property: 'callToAction.url' },
				},
			},
			{
				displayName: 'Start Date and Time',
				name: 'startDateTime',
				type: 'dateTime',
				default: '',
				description: 'The start date and time of the event',
			},
			{
				displayName: 'End Date and Time',
				name: 'endDateTime',
				type: 'dateTime',
				default: '',
				description: 'The end date and time of the event',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'E.g. 20% off in store or online.',
				routing: { send: { type: 'body', property: 'event.title' } },
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'The start date of the offer',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'The end date of the offer',
			},
			{
				displayName: 'Coupon Code',
				name: 'couponCode',
				type: 'string',
				default: '',
				description: 'The coupon code for the offer',
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
				routing: {
					send: { type: 'body', property: 'offer.redeemOnlineUrl' },
				},
			},
			{
				displayName: 'Terms and Conditions',
				name: 'termsConditions',
				type: 'string',
				default: '',
				description: 'The terms and conditions of the offer',
				routing: {
					send: { type: 'body', property: 'offer.termsConditions' },
				},
			},
		],
	},
];
