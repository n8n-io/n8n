import { INodeProperties } from "n8n-workflow";

export const userOpeations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new user',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a user',
			},
			{
				name: 'View',
				value: 'view',
				description: 'View a user',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List users',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a user',
			}
		],
		default: '',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const userFields = [

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
				resource: [
					'user',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The Intercom defined id representing the Lead',
	},

/* -------------------------------------------------------------------------- */
/*                                  user:list                                 */
/* -------------------------------------------------------------------------- */

	{
		displayName: 'List by',
		name: 'listBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'user',
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
				name: 'Segment ID',
				value: 'segmentId',
				default: '',
				description: 'Segment representing the Lead',
			},
			{
				name: 'Tag ID',
				value: 'tagId',
				default: '',
				description: 'Tag representing the Lead',
			},
			{
				name: 'Company ID',
				value: 'companyId',
				default: '',
				description: 'Company representing the Lead',
			},
			{
				name: 'All',
				value: 'all',
				default: '',
				description: 'List all users',
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
					'user',
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
/*                                  view:user                                 */
/* -------------------------------------------------------------------------- */

	{
		displayName: 'View By',
		name: 'viewBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'user',
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
					'user',
				],
				operation: [
					'view',
				],
			},
		},
		description: 'View by value',
	},

/* -------------------------------------------------------------------------- */
/*                                 user:update                                */
/* -------------------------------------------------------------------------- */

	{
		displayName: 'Id',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'id is matched - the user_id and email will be updated if they are sent.',
	},
	{
		displayName: 'User Id',
		name: 'userId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'user_id match - the email will be updated, the id is not updated.',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'update',
				],
			},
		},
		description: `email match where no user_id set on the matching user - the user_id will be set to the value sent in the request, the id is not updated.
		email match where there is a user_id set on the matching user - a new unique record with new id will be created if a new value for user_id is sent in the request.`,
	},

/* -------------------------------------------------------------------------- */
/*                                 user:create                                */
/* -------------------------------------------------------------------------- */

	{
		displayName: 'Id',
		name: 'id',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				name: 'User Id',
				value: 'userId',
				default: '',
				description: 'A unique string identifier for the user. It is required on creation if an email is not supplied.',
			},
			{
				name: 'Email',
				value: 'email',
				default: '',
				description: `The user's email address. It is required on creation if a user_id is not supplied.`,
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
				resource: [
					'user',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Unique string identifier value',
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
					'user'
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
					'user'
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
				description: 'Whether the user is unsubscribed from emails',
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
				displayName: 'Session Count',
				name: 'sessionCount',
				type: 'number',
				default: false,
				options: [],
				description: `How many sessions the user has recorded`,
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
					'user',
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
					'user',
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

