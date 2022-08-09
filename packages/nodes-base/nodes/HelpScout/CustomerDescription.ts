import { INodeProperties } from 'n8n-workflow';

export const customerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new customer',
				action: 'Create a customer',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a customer',
				action: 'Get a customer',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all customers',
				action: 'Get all customers',
			},
			{
				name: 'Properties',
				value: 'properties',
				description: 'Get customer property definitions',
				action: 'Get customer properties',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a customer',
				action: 'Update a customer',
			},
		],
		default: 'create',
	},
];

export const customerFields: INodeProperties[] = [
/* -------------------------------------------------------------------------- */
/*                                customer:create                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Resolve Data',
		name: 'resolveData',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'customer',
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
		description: 'By default the response only contain the ID to resource. If this option gets activated, it will resolve the data automatically.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'customer',
				],
			},
		},
		options: [
			{
				displayName: 'Age',
				name: 'age',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'Customer’s age',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the customer. When defined it must be between 1 and 40 characters.',
			},
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'options',
				options: [
					{
						name: 'Female',
						value: 'female',
					},
					{
						name: 'Male',
						value: 'male',
					},
					{
						name: 'Unknown',
						value: 'unknown',
					},
				],
				default: '',
				description: 'Gender of this customer',
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
				description: 'Job title. Max length 60 characters.',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the customer',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: '',
				description: 'Location of the customer',
			},
			{
				displayName: 'Notes',
				name: 'background',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Organization',
				name: 'organization',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Photo Url',
				name: 'photoUrl',
				type: 'string',
				default: '',
				description: 'URL of the customer’s photo',
			},
		],
	},
	{
		displayName: 'Address',
		name: 'addressUi',
		placeholder: 'Add Address',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'customer',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Address',
				name: 'addressValue',
				values: [
					{
						displayName: 'Line 1',
						name: 'line1',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Line 2',
						name: 'line2',
						type: 'string',
						default: '',
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
					},
					{
						displayName: 'State',
						name: 'state',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country Name or ID',
						name: 'country',
						type: 'options',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getCountriesCodes',
						},
						default: '',
					},
					{
						displayName: 'Postal Code',
						name: 'postalCode',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Chat Handles',
		name: 'chatsUi',
		placeholder: 'Add Chat Handle',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'customer',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Chat Handle',
				name: 'chatsValues',
				values: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'AIM',
								value: 'aim',
							},
							{
								name: 'Google Talk',
								value: 'gtalk',
							},
							{
								name: 'ICQ',
								value: 'icq',
							},
							{
								name: 'MSN',
								value: 'msn',
							},
							{
								name: 'Other',
								value: 'other',
							},
							{
								name: 'QQ',
								value: 'qq',
							},
							{
								name: 'Skype',
								value: 'skype',
							},
							{
								name: 'XMPP',
								value: 'xmpp',
							},
							{
								name: 'Yahoo',
								value: 'yahoo',
							},
						],
						description: 'Chat type',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Chat handle',
					},
				],
			},
		],
	},
	{
		displayName: 'Emails',
		name: 'emailsUi',
		placeholder: 'Add Email',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'customer',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Email',
				name: 'emailsValues',
				values: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Home',
								value: 'home',
							},
							{
								name: 'Other',
								value: 'other',
							},
							{
								name: 'Work',
								value: 'work',
							},
						],
						description: 'Location for this email address',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Email',
					},
				],
			},
		],
	},
	{
		displayName: 'Phones',
		name: 'phonesUi',
		placeholder: 'Add Phone',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'customer',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Email',
				name: 'phonesValues',
				values: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Fax',
								value: 'fax',
							},
							{
								name: 'Home',
								value: 'home',
							},
							{
								name: 'Other',
								value: 'other',
							},
							{
								name: 'Pager',
								value: 'pager',
							},
							{
								name: 'Work',
								value: 'work',
							},
						],
						description: 'Location for this phone',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Phone',
					},
				],
			},
		],
	},
	{
		displayName: 'Social Profiles',
		name: 'socialProfilesUi',
		placeholder: 'Add Social Profile',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'customer',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Social Profile',
				name: 'socialProfilesValues',
				values: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'About Me',
								value: 'aboutMe',
							},
							{
								name: 'Facebook',
								value: 'facebook',
							},
							{
								name: 'Flickr',
								value: 'flickr',
							},
							{
								name: 'Forsquare',
								value: 'forsquare',
							},
							{
								name: 'Google',
								value: 'google',
							},
							{
								name: 'Google Plus',
								value: 'googleplus',
							},
							{
								name: 'Linkedin',
								value: 'linkedin',
							},
							{
								name: 'Other',
								value: 'other',
							},
							{
								name: 'Quora',
								value: 'quora',
							},
							{
								name: 'Tungleme',
								value: 'tungleme',
							},
							{
								name: 'Twitter',
								value: 'twitter',
							},
							{
								name: 'Youtube',
								value: 'youtube',
							},
						],
						description: 'Type of social profile',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Social Profile handle (URL for example)',
					},
				],
			},
		],
	},
	{
		displayName: 'Websites',
		name: 'websitesUi',
		placeholder: 'Add Website',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'customer',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Website',
				name: 'websitesValues',
				values: [
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Website URL',
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                customer:getAll                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'customer',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'customer',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'Filters customers by first name',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Filters customers by last name',
			},
			{
				displayName: 'Mailbox ID',
				name: 'mailbox',
				type: 'string',
				default: '',
				description: 'Filters customers from a specific mailbox',
			},
			{
				displayName: 'Modified Since',
				name: 'modifiedSince',
				type: 'dateTime',
				default: '',
				description: 'Returns only customers that were modified after this date',
			},
			{
				displayName: 'Sort Field',
				name: 'sortField',
				type: 'options',
				options: [
					{
						name: 'Score',
						value: 'score',
					},
					{
						name: 'First Name',
						value: 'firstName',
					},
					{
						name: 'Last Name',
						value: 'lastName',
					},
					{
						name: 'Modified At',
						value: 'modifiedAt',
					},
				],
				default: 'score',
				description: 'Sorts the result by specified field',
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'asc',
					},
					{
						name: 'DESC',
						value: 'desc',
					},
				],
				default: 'desc',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Advanced search <a href="https://developer.helpscout.com/mailbox-api/endpoints/customers/list/#query">Examples</a>',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                customer:get                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'get',
				],
			},
		},
	},
/* -------------------------------------------------------------------------- */
/*                                customer:update                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'customer',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'customer',
				],
			},
		},
		options: [
			{
				displayName: 'Age',
				name: 'age',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'Customer’s age',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the customer. When defined it must be between 1 and 40 characters.',
			},
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'options',
				options: [
					{
						name: 'Female',
						value: 'female',
					},
					{
						name: 'Male',
						value: 'male',
					},
					{
						name: 'Unknown',
						value: 'unknown',
					},
				],
				default: '',
				description: 'Gender of this customer',
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
				description: 'Job title. Max length 60 characters.',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the customer',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: '',
				description: 'Location of the customer',
			},
			{
				displayName: 'Notes',
				name: 'background',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Organization',
				name: 'organization',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Photo Url',
				name: 'photoUrl',
				type: 'string',
				default: '',
				description: 'URL of the customer’s photo',
			},
		],
	},
];
