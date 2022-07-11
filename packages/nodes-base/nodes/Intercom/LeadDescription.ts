import { INodeProperties } from 'n8n-workflow';

export const leadOpeations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new lead',
				action: 'Create a lead',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a lead',
				action: 'Delete a lead',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a lead',
				action: 'Get a lead',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all leads',
				action: 'Get all leads',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update new lead',
				action: 'Update a lead',
			},
		],
		default: 'create',
	},
];

export const leadFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 lead:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Delete By',
		name: 'deleteBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'delete',
				],
			},
		},
		options: [
			{
				name: 'ID',
				value: 'id',
				description: 'The Intercom defined ID representing the Lead',
			},
			{
				name: 'User ID',
				value: 'userId',
				description: 'Automatically generated identifier for the Lead',
			},
		],
		default: '',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'Delete by value',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  lead:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Select By',
		name: 'selectBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				name: 'Email',
				value: 'email',
				description: 'Email representing the Lead',
			},
			{
				name: 'ID',
				value: 'id',
				description: 'The Intercom defined ID representing the Lead',
			},
			{
				name: 'User ID',
				value: 'userId',
				description: 'Automatically generated identifier for the Lead',
			},
			{
				name: 'Phone',
				value: 'phone',
				description: 'Phone representing the Lead',
			},
		],
		default: '',
		description: 'The property to select the lead by',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'View by value',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  lead:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'getAll',
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
				resource: [
					'lead',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
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
				resource: [
					'lead',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'The email address of the lead',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'The phone number of the lead',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 lead:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Update By',
		name: 'updateBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				name: 'User ID',
				value: 'userId',
				description: 'Automatically generated identifier for the Lead',
			},
			{
				name: 'ID',
				value: 'id',
				description: 'The Intercom defined ID representing the Lead',
			},
		],
		default: 'id',
		description: 'The property via which to query the lead',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Value of the property to identify the lead to update',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 lead:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The email of the user',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'lead',
				],
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
				operation: [
					'create',
					'update',
				],
				resource: [
					'lead',
				],
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
				description: 'Identifies the companies this user belongs to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				displayOptions: {
					show: {
						'/resource': [
							'lead',
						],
						'/operation': [
							'update',
						],
					},
				},
				description: 'The email of the user',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
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
				displayName: 'Unsubscribed From Emails',
				name: 'unsubscribedFromEmails',
				type: 'boolean',
				default: false,
				description: 'Whether the Lead is unsubscribed from emails',
			},
			{
				displayName: 'Update Last Request At',
				name: 'updateLastRequestAt',
				type: 'boolean',
				default: false,
				description: 'Whether to instruct Intercom to update the users last_request_at value to the current API service time in UTC. default value if not sent is false.',
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
				resource: [
					'lead',
				],
				operation: [
					'create',
					'update',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'A hash of key/value pairs to represent custom data you want to attribute to a user',
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
				resource: [
					'lead',
				],
				operation: [
					'create',
					'update',
				],
				jsonParameters: [
					false,
				],
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
		description: 'A hash of key/value pairs to represent custom data you want to attribute to a user',
	},
];
