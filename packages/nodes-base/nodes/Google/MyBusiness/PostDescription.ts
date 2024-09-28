import {
	NodeApiError,
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type INodeProperties,
	type JsonObject,
} from 'n8n-workflow';
import {
	addUpdateMaskPresend,
	handleDatesPresend,
	// handleDisplayOptionsBugPresend,
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
						url: '=/{{$parameter["post"]}}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							async function (
								this: IExecuteSingleFunctions,
								data: INodeExecutionData[],
								response: IN8nHttpFullResponse,
							): Promise<INodeExecutionData[]> {
								if (response.statusCode < 200 || response.statusCode >= 300) {
									const post = this.getNodeParameter('post', undefined) as IDataObject;
									if (post && response.statusCode === 404) {
										// Don't return a 404 error if the post does not exist
										throw new NodeOperationError(
											this.getNode(),
											'The post you are deleting could not be found. Adjust the "post" parameter setting to delete the post correctly',
										);
									}

									throw new NodeApiError(this.getNode(), response.body as JsonObject, {
										message: response.statusMessage,
										httpCode: response.statusCode.toString(),
									});
								}
								return data;
							},
						],
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
						postReceive: [
							async function (
								this: IExecuteSingleFunctions,
								data: INodeExecutionData[],
								response: IN8nHttpFullResponse,
							): Promise<INodeExecutionData[]> {
								if (response.statusCode < 200 || response.statusCode >= 300) {
									const post = this.getNodeParameter('post', undefined) as IDataObject;
									if (post && response.statusCode === 404) {
										// Don't return a 404 error if the post does not exist
										throw new NodeOperationError(
											this.getNode(),
											'The post you are requesting could not be found. Adjust the "post" parameter setting to retrieve the post correctly',
										);
									}

									throw new NodeApiError(this.getNode(), response.body as JsonObject, {
										message: response.statusMessage,
										httpCode: response.statusCode.toString(),
									});
								}
								return data;
							},
						],
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
					send: {
						preSend: [
							handleDatesPresend,
							addUpdateMaskPresend,
							// handleDisplayOptionsBugPresend
						],
					},
					request: {
						method: 'PATCH',
						url: '=/{{$parameter["post"]}}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							async function (
								this: IExecuteSingleFunctions,
								data: INodeExecutionData[],
								response: IN8nHttpFullResponse,
							): Promise<INodeExecutionData[]> {
								if (response.statusCode < 200 || response.statusCode >= 300) {
									const post = this.getNodeParameter('post') as IDataObject;
									const additionalOptions = this.getNodeParameter(
										'additionalOptions',
									) as IDataObject;
									if (post && response.statusCode === 404) {
										// Don't return a 404 error if the post does not exist
										throw new NodeOperationError(
											this.getNode(),
											'The post you are updating could not be found. Adjust the "post" parameter setting to update the post correctly',
										);
									}

									if (response.statusCode === 400 && Object.keys(additionalOptions).length === 0) {
										// Only display the hint if no additional options are set
										return [{ json: { success: true } }];
									}

									throw new NodeApiError(this.getNode(), response.body as JsonObject, {
										message: response.statusMessage,
										httpCode: response.statusCode.toString(),
									});
								}
								return data;
							},
						],
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
		description: 'The Google My Business account',
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
		default: 'ALERT_TYPE_UNSPECIFIED',
		description: 'The sub-type of the alert',
		displayOptions: { show: { resource: ['post'], operation: ['create'], postType: ['ALERT'] } },
		routing: {
			send: { type: 'body', property: 'alertType' },
		},
		options: [
			{
				name: 'Alert Type Unspecified',
				value: 'ALERT_TYPE_UNSPECIFIED',
				description: 'Sub-type unspecified',
			},
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
		description: 'The Google My Business account',
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
		description: 'The Google My Business account',
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
		description: 'The Google My Business account',
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
		default: { mode: 'list', value: '' },
		description: 'The Google My Business account',
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
			// The request fails when trying to update post type
			// {
			// 	displayName: 'Post Type',
			// 	name: 'postType',
			// 	type: 'options',
			// 	default: 'STANDARD',
			// 	description: 'The type of post to create (standard, event, offer, or alert)',
			// 	routing: { send: { type: 'body', property: 'topicType' } },
			// 	options: [
			// 		{
			// 			name: 'Standard',
			// 			value: 'STANDARD',
			// 		},
			// 		{
			// 			name: 'Event',
			// 			value: 'EVENT',
			// 		},
			// 		{
			// 			name: 'Offer',
			// 			value: 'OFFER',
			// 		},
			// 		{
			// 			name: 'Alert',
			// 			value: 'ALERT',
			// 		},
			// 	],
			// },
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
				displayName: 'Alert Type',
				name: 'alertType',
				type: 'options',
				default: 'ALERT_TYPE_UNSPECIFIED',
				description: 'The sub-type of the alert',
				// displayOptions: { show: { postType: ['ALERT'] } },
				routing: {
					send: { type: 'body', property: 'alertType' },
				},
				options: [
					{
						name: 'Alert Type Unspecified',
						value: 'ALERT_TYPE_UNSPECIFIED',
						description: 'Sub-type unspecified',
					},
					{
						name: 'Covid 19',
						value: 'COVID_19',
						description: 'This alert is related to the 2019 Coronavirus Disease pandemic',
					},
				],
			},
			{
				displayName: 'Call to Action Type',
				name: 'callToActionType',
				type: 'options',
				default: 'ACTION_TYPE_UNSPECIFIED',
				description: 'The type of call to action',
				// displayOptions: { show: { postType: ['STANDARD', 'EVENT', 'ALERT'] } },
				// There is a bug when using displayOptions + routing. Routing can be handled with "handleDisplayOptionsBugPresend" if needed.
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
				// displayOptions: { show: { postType: ['STANDARD', 'EVENT', 'ALERT'] } },
				// There is a bug when using displayOptions + routing. Routing can be handled with "handleDisplayOptionsBugPresend" if needed.
				routing: {
					send: { type: 'body', property: 'callToAction.url' },
				},
			},
			// {
			// 	displayName: 'Title',
			// 	name: 'title',
			// 	type: 'string',
			// 	default: '',
			// 	description: 'E.g. Sales this week.',
			// 	// displayOptions: { show: { postType: ['EVENT'] } },
			// 	// There is a bug when using displayOptions + routing. Routing can be handled with "handleDisplayOptionsBugPresend" if needed.
			// 	// routing: { send: { type: 'body', property: 'event.title' } },
			// },
			{
				displayName: 'Start Date and Time',
				name: 'startDateTime',
				type: 'dateTime',
				default: '',
				description: 'The start date and time of the event',
				// displayOptions: { show: { postType: ['EVENT'] } },
			},
			{
				displayName: 'End Date and Time',
				name: 'endDateTime',
				type: 'dateTime',
				default: '',
				description: 'The end date and time of the event',
				// displayOptions: { show: { postType: ['EVENT'] } },
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'E.g. 20% off in store or online.',
				// displayOptions: { show: { postType: ['OFFER'] } },
				// There is a bug when using displayOptions + routing. Routing can be handled with "handleDisplayOptionsBugPresend" if needed.
				routing: { send: { type: 'body', property: 'event.title' } },
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'The start date of the offer',
				// displayOptions: { show: { postType: ['OFFER'] } },
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'The end date of the offer',
				// displayOptions: { show: { postType: ['OFFER'] } },
			},
			{
				displayName: 'Coupon Code',
				name: 'couponCode',
				type: 'string',
				default: '',
				description: 'The coupon code for the offer',
				// displayOptions: { show: { postType: ['OFFER'] } },
				// There is a bug when using displayOptions + routing. Routing can be handled with "handleDisplayOptionsBugPresend" if needed.
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
				// displayOptions: { show: { postType: ['OFFER'] } },
				// There is a bug when using displayOptions + routing. Routing can be handled with "handleDisplayOptionsBugPresend" if needed.
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
				// displayOptions: { show: { postType: ['OFFER'] } },
				// There is a bug when using displayOptions + routing. Routing can be handled with "handleDisplayOptionsBugPresend" if needed.
				routing: {
					send: { type: 'body', property: 'offer.termsConditions' },
				},
			},
		],
	},
];
