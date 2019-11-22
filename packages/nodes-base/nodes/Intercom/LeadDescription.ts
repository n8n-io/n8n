import { INodeProperties } from "n8n-workflow";

export const leadOpeations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update new lead',
			},
			{
				name: 'View',
				value: 'view',
				description: 'View a lead',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List leads',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a lead',
			}
		],
		default: '',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const leadFields = [

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
				default: '',
				description: 'The Intercom defined id representing the Lead',
			},
			{
				name: 'User ID',
				value: 'userId',
				default: '',
				description: 'Automatically generated identifier for the Lead',
			},
		],
		default: '',
		description: 'Delete by'
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
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
/*                                  lead:view                                 */
/* -------------------------------------------------------------------------- */

	{
		displayName: 'View By',
		name: 'viewBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'view',
				],
			},
		},
		options: [
			{
				name: 'ID',
				value: 'id',
				default: '',
				description: 'The Intercom defined id representing the Lead',
			},
			{
				name: 'User ID',
				value: 'userId',
				default: '',
				description: 'Automatically generated identifier for the Lead',
			},
			{
				name: 'Phone',
				value: 'phone',
				default: '',
				description: 'Phone representing the Lead',
			},
		],
		default: '',
		description: 'View by'
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
					'view',
				],
			},
		},
		description: 'View by value',
	},

/* -------------------------------------------------------------------------- */
/*                                  lead:list                                 */
/* -------------------------------------------------------------------------- */

	{
		displayName: 'List by',
		name: 'listBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'lead',
				],
				operation: [
					'list',
				],
			},
		},
		options: [
			{
				name: 'Email',
				value: 'email',
				default: '',
				description: 'Email representing the Lead',
			},
			{
				name: 'Phone',
				value: 'phone',
				default: '',
				description: 'Phone representing the Lead',
			},
			{
				name: 'All',
				value: 'all',
				default: '',
				description: 'List all leads',
			},
		],
		default: '',
		description: 'List by'
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
					'list',
				],
			},
			hide: {
				listBy: [
					'all'
				]
			}
		},
		description: 'list by value',
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
				default: '',
				description: 'Automatically generated identifier for the Lead',
			},
			{
				name: 'ID',
				value: 'id',
				default: '',
				description: 'The Intercom defined id representing the Lead',
			},
		],
		default: '',
		description: 'Update by',
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
		description: 'Update by value',
	},

/* -------------------------------------------------------------------------- */
/*                                 lead:create                                */
/* -------------------------------------------------------------------------- */

	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
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
		description: 'The email of the user.',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		required: false,
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
		description: 'The email of the user.',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'lead'
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'lead'
				],
			},
		},
		options: [
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'The phone number of the user',
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
				displayName: 'Unsubscribed From Emails',
				name: 'unsubscribedFromEmails',
				type: 'boolean',
				default: '',
				placeholder: '',
				description: 'Whether the Lead is unsubscribed from emails',
			},
			{
				displayName: 'Update Last Request At',
				name: 'updateLastRequestAt',
				type: 'boolean',
				default: false,
				options: [],
				description: `A boolean value, which if true, instructs Intercom to update the users' last_request_at value to the current API service time in UTC. default value if not sent is false.`,
			},
			{
				displayName: 'Companies',
				name: 'companies',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: [],
				description: 'Identifies the companies this user belongs to.',
			},
			{
				displayName: 'Avatar',
				name: 'avatar',
				type: 'string',
				default: '',
				description: 'An avatar image URL. note: the image url needs to be https.',
			},
			{
				displayName: 'UTM Source',
				name: 'utmSource',
				type: 'string',
				default: '',
				description: 'An avatar image URL. note: the image url needs to be https.',
			},
			{
				displayName: 'UTM Medium',
				name: 'utmMedium',
				type: 'string',
				default: '',
				description: 'Identifies what type of link was used',
			},
			{
				displayName: 'UTM Campaign',
				name: 'utmCampaign',
				type: 'string',
				default: '',
				description: 'Identifies a specific product promotion or strategic campaign',
			},
			{
				displayName: 'UTM Term',
				name: 'utmTerm',
				type: 'string',
				default: '',
				description: 'Identifies search terms',
			},
			{
				displayName: 'UTM Content',
				name: 'utmContent',
				type: 'string',
				default: '',
				description: 'Identifies what specifically was clicked to bring the user to the site',
			},
		]
	},
	{
		displayName: 'Custom Attributes',
		name: 'customAttributesJson',
		type: 'json',
		required: false,
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
		description: 'A hash of key/value pairs to represent custom data you want to attribute to a user.',
	},
	{
		displayName: 'Custom Attributes',
		name: 'customAttributesUi',
		type: 'fixedCollection',
		default: '',
		placeholder: 'Add Attribute',
		typeOptions: {
			multipleValues: true,
		},
		required: false,
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
			}
		],
		description: 'A hash of key/value pairs to represent custom data you want to attribute to a user.',
	},
] as INodeProperties[];

