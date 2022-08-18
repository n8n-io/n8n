import { INodeProperties } from 'n8n-workflow';

export const userOpeations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new user',
				action: 'Create a user',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a user',
				action: 'Delete a user',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a user',
				action: 'Get a user',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all users',
				action: 'Get all users',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a user',
				action: 'Update a user',
			},
		],
		default: 'create',
	},
];

export const userFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 user:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'The Intercom defined ID representing the Lead',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  user:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
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
				resource: ['user'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 60,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Company ID',
				name: 'company_id',
				type: 'string',
				default: '',
				description: 'Company ID representing the user',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'The email address of the user',
			},
			{
				displayName: 'Segment ID',
				name: 'segment_id',
				type: 'string',
				default: '',
				description: 'Segment representing the user',
			},
			{
				displayName: 'Tag ID',
				name: 'tag_id',
				type: 'string',
				default: '',
				description: 'Tag representing the user',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  user:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Select By',
		name: 'selectBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		options: [
			{
				name: 'ID',
				value: 'id',
				default: '',
				description: 'The Intercom defined ID representing the Lead',
			},
			{
				name: 'User ID',
				value: 'userId',
				default: '',
				description: 'Automatically generated identifier for the Lead',
			},
		],
		default: '',
		description: 'The property to select the user by',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		description: 'View by value',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 user:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Update By',
		name: 'updateBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
		options: [
			{
				name: 'ID',
				value: 'id',
				description: 'The Intercom defined ID representing the user',
			},
			{
				name: 'Email',
				value: 'email',
				description: 'The email address of user',
			},
			{
				name: 'User ID',
				value: 'userId',
				description: 'Automatically generated identifier for the user',
			},
		],
		default: 'id',
		description: 'The property via which to query the user',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
		description: 'Value of the property to identify the user to update',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 user:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Identifier Type',
		name: 'identifierType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'User ID',
				value: 'userId',
				description:
					'A unique string identifier for the user. It is required on creation if an email is not supplied.',
			},
			{
				name: 'Email',
				value: 'email',
				description:
					"The user's email address. It is required on creation if a user_id is not supplied.",
			},
		],
		default: '',
		description: 'Unique string identifier',
	},
	{
		displayName: 'Value',
		name: 'idValue',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		description: 'Unique string identifier value',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['user'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['user'],
			},
		},
		options: [
			{
				displayName: 'Avatar',
				name: 'avatar',
				type: 'string',
				default: '',
				description: 'An avatar image URL. note: the image URL needs to be https.',
			},
			{
				displayName: 'Company Names or IDs',
				name: 'companies',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: [],
				description:
					'Identifies the companies this user belongs to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Email',
				name: 'email',
				displayOptions: {
					show: {
						'/operation': ['update'],
						'/resource': ['user'],
					},
					hide: {
						'/updateBy': ['email'],
					},
				},
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Email of the user',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: '',
				description: 'Name of the user',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'The phone number of the user',
			},
			{
				displayName: 'Session Count',
				name: 'sessionCount',
				type: 'number',
				default: false,
				options: [],
				description: 'How many sessions the user has recorded',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				displayOptions: {
					show: {
						'/operation': ['update'],
						'/resource': ['user'],
					},
					hide: {
						'/updateBy': ['email', 'userId'],
					},
				},
				type: 'string',
				default: '',
				description: 'Email of the user',
			},
			{
				displayName: 'Unsubscribed From Emails',
				name: 'unsubscribedFromEmails',
				type: 'boolean',
				default: false,
				placeholder: '',
				description: 'Whether the user is unsubscribed from emails',
			},
			{
				displayName: 'Update Last Request At',
				name: 'updateLastRequestAt',
				type: 'boolean',
				default: false,
				options: [],
				description:
					'Whether to instruct Intercom to update the users last_request_at value to the current API service time in UTC',
			},
			{
				displayName: 'UTM Campaign',
				name: 'utmCampaign',
				type: 'string',
				default: '',
				description: 'Identifies a specific product promotion or strategic campaign',
			},
			{
				displayName: 'UTM Content',
				name: 'utmContent',
				type: 'string',
				default: '',
				description: 'Identifies what specifically was clicked to bring the user to the site',
			},
			{
				displayName: 'UTM Medium',
				name: 'utmMedium',
				type: 'string',
				default: '',
				description: 'Identifies what type of link was used',
			},
			{
				displayName: 'UTM Source',
				name: 'utmSource',
				type: 'string',
				default: '',
				description: 'An avatar image URL. note: the image URL needs to be https.',
			},
			{
				displayName: 'UTM Term',
				name: 'utmTerm',
				type: 'string',
				default: '',
				description: 'Identifies search terms',
			},
		],
	},
	{
		displayName: 'Custom Attributes',
		name: 'customAttributesJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create', 'update'],
				jsonParameters: [true],
			},
		},
		default: '',
		description:
			'A hash of key/value pairs to represent custom data you want to attribute to a user',
	},
	{
		displayName: 'Custom Attributes',
		name: 'customAttributesUi',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Attribute',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create', 'update'],
				jsonParameters: [false],
			},
		},
		options: [
			{
				name: 'customAttributesValues',
				displayName: 'Attributes',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
		description:
			'A hash of key/value pairs to represent custom data you want to attribute to a user',
	},
];
