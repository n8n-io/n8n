import type { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new contact',
				action: 'Create a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a contact',
				action: 'Get a contact',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many contacts',
				action: 'Get many contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
				action: 'Update a contact',
			},
		],
		default: 'create',
	},
];

export const contactFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                contact:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Delete By',
		name: 'deleteBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['delete'],
			},
		},
		options: [
			{
				name: 'ID',
				value: 'id',
				description: 'The Intercom defined ID representing the Contact',
			},
			{
				name: 'User ID',
				value: 'userId',
				description: 'Automatically generated identifier for the Contact',
			},
		],
		default: 'id',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['delete'],
			},
		},
		description: 'Delete by value',
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Select By',
		name: 'selectBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
		options: [
			{
				name: 'Email',
				value: 'email',
				description: 'Email representing the Contact',
			},
			{
				name: 'ID',
				value: 'id',
				description: 'The Intercom defined ID representing the Contact',
			},
			{
				name: 'User ID',
				value: 'userId',
				description: 'Automatically generated identifier for the Contact',
			},
			{
				name: 'Phone',
				value: 'phone',
				description: 'Phone representing the Contact',
			},
		],
		default: 'id',
		description: 'The property to select the contact by',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
		description: 'View by value',
	},

	/* -------------------------------------------------------------------------- */
	/*                               contact:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['contact'],
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
				resource: ['contact'],
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
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Company ID',
				name: 'company_id',
				type: 'string',
				default: '',
				description: 'Company ID representing the contact',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'The email address of the contact',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'The phone number of the contact',
			},
			{
				displayName: 'Segment ID',
				name: 'segment_id',
				type: 'string',
				default: '',
				description: 'Segment representing the contact',
			},
			{
				displayName: 'Tag ID',
				name: 'tag_id',
				type: 'string',
				default: '',
				description: 'Tag representing the contact',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                               contact:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Update By',
		name: 'updateBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		options: [
			{
				name: 'ID',
				value: 'id',
				description: 'The Intercom defined ID representing the contact',
			},
			{
				name: 'Email',
				value: 'email',
				description: 'The email address of contact',
			},
			{
				name: 'User ID',
				value: 'userId',
				description: 'Automatically generated identifier for the contact',
			},
		],
		default: 'id',
		description: 'The property via which to query the contact',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		description: 'Value of the property to identify the contact to update',
	},

	/* -------------------------------------------------------------------------- */
	/*                               contact:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Identifier Type',
		name: 'identifierType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'User ID',
				value: 'userId',
				description:
					'A unique string identifier for the contact. It is required on creation if an email is not supplied.',
			},
			{
				name: 'Email',
				value: 'email',
				description:
					"The contact's email address. It is required on creation if a user_id is not supplied.",
			},
		],
		default: 'email',
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
				resource: ['contact'],
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
				resource: ['contact'],
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
				resource: ['contact'],
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
					'Identifies the companies this contact belongs to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Email of the contact',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: '',
				description: 'Name of the contact',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'The phone number of the contact',
			},
			{
				displayName: 'Session Count',
				name: 'sessionCount',
				type: 'number',
				default: '',
				description: 'How many sessions the contact has recorded',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				description: 'The user_id of the contact',
			},
			{
				displayName: 'Unsubscribed From Emails',
				name: 'unsubscribedFromEmails',
				type: 'boolean',
				default: false,
				placeholder: '',
				description: 'Whether the contact is unsubscribed from emails',
			},
			{
				displayName: 'Update Last Request At',
				name: 'updateLastRequestAt',
				type: 'boolean',
				default: false,
				description:
					'Whether to instruct Intercom to update the contact last_request_at value to the current API service time in UTC',
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
				resource: ['contact'],
				operation: ['create', 'update'],
				jsonParameters: [true],
			},
		},
		default: '',
		description:
			'A hash of key/value pairs to represent custom data you want to attribute to a contact',
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
				resource: ['contact'],
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
			'A hash of key/value pairs to represent custom data you want to attribute to a contact',
	},
];
