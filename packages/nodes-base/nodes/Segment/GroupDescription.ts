import {
	INodeProperties,
} from 'n8n-workflow';

export const groupOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'group',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a user to a group',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const groupFields = [

/* -------------------------------------------------------------------------- */
/*                                group:add                                   */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'add',
				],
			},
		},
		required: false,
	},
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'add',
				],
			},
		},
		description: 'A Group ID is the unique identifier which you recognize a group by in your own database',
		required: true,
	},
	{
		displayName: 'Traits',
		name: 'traits',
		placeholder: 'Add Trait',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'add',
				],
			},
		},
		default: {},
		options: [
			{
				name: 'traitsUi',
				displayName: 'Trait',
				values: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						default: '',
						description: 'Email address of a user',
					},
					{
						displayName: 'First Name',
						name: 'firstname',
						type: 'string',
						default: '',
						description: 'First name of a user',
					},
					{
						displayName: 'Last Name',
						name: 'lastname',
						type: 'string',
						default: '',
						description: 'Last name of a user',
					},
					{
						displayName: 'Gender',
						name: 'gender',
						type: 'string',
						default: '',
						description: 'Gender of a user',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						description: 'Phone number of a user',
					},
					{
						displayName: 'Username',
						name: 'username',
						type: 'string',
						default: '',
						description: 'User’s username',
					},
					{
						displayName: 'Website',
						name: 'website',
						type: 'string',
						default: '',
						description: 'Website of a user',
					},
					{
						displayName: 'Age',
						name: 'age',
						type: 'number',
						default: 1,
						description: 'Age of a user',
					},
					{
						displayName: 'Avatar',
						name: 'avatar',
						type: 'string',
						default: '',
						description: 'URL to an avatar image for the user',
					},
					{
						displayName: 'Birthday',
						name: 'birthday',
						type: 'dateTime',
						default: '',
						description: 'User’s birthday',
					},
					{
						displayName: 'Created At',
						name: 'createdAt',
						type: 'dateTime',
						default: '',
						description: 'Date the user’s account was first created',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'Description of the user',
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'Unique ID in your database for a user',
					},
					{
						displayName: 'Company',
						name: 'company',
						placeholder: 'Add Company',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						default: {},
						options: [
							{
								name: 'companyUi',
								displayName: 'Company',
								values: [
									{
										displayName: 'ID',
										name: 'id',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Industry',
										name: 'industry',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Employee Count',
										name: 'employeeCount',
										type: 'number',
										default: 1,
									},
									{
										displayName: 'Plan',
										name: 'plan',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Address',
						name: 'address',
						placeholder: 'Add Address',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						default: {},
						options: [
							{
								name: 'addressUi',
								displayName: 'Address',
								values: [
									{
										displayName: 'Street',
										name: 'street',
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
										displayName: 'Postal Code',
										name: 'postalCode',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Country',
										name: 'country',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Context',
		name: 'context',
		placeholder: 'Add Context',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'add',
				],
			},
		},
		default: {},
		options: [
			{
				name: 'contextUi',
				displayName: 'Context',
				values: [
					{
						displayName: 'Active',
						name: 'active',
						type: 'boolean',
						default: '',
						description: 'Whether a user is active',
					},
					{
						displayName: 'IP',
						name: 'ip',
						type: 'string',
						default: '',
						description: 'Current user’s IP address.',
					},
					{
						displayName: 'Locale',
						name: 'locate',
						type: 'string',
						default: '',
						description: 'Locale string for the current user, for example en-US.',
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'string',
						default: '',
						description: 'Dictionary of information about the current page in the browser, containing hash, path, referrer, search, title and url',
					},
					{
						displayName: 'Timezone',
						name: 'timezone',
						type: 'string',
						default: '',
						description: 'Timezones are sent as tzdata strings to add user timezone information which might be stripped from the timestamp, for example America/New_York',
					},
					{
						displayName: 'App',
						name: 'app',
						placeholder: 'Add App',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						default: {},
						options: [
							{
								name: 'appUi',
								displayName: 'App',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Version',
										name: 'version',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Build',
										name: 'build',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Campaign',
						name: 'campaign',
						placeholder: 'Campaign App',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						default: {},
						options: [
							{
								name: 'campaignUi',
								displayName: 'Campaign',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Source',
										name: 'source',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Medium',
										name: 'medium',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Term',
										name: 'term',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Content',
										name: 'content',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Device',
						name: 'device',
						placeholder: 'Add Device',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						default: {},
						options: [
							{
								name: 'deviceUi',
								displayName: 'Device',
								values: [
									{
										displayName: 'ID',
										name: 'id',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Manufacturer',
										name: 'manufacturer',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Model',
										name: 'model',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Type',
										name: 'type',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Version',
										name: 'version',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Integration',
		name: 'integrations',
		placeholder: 'Add Integration',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'add',
				],
			},
		},
		default: {},
		options: [
			{
				name: 'integrationsUi',
				displayName: 'Integration',
				values: [
					{
						displayName: 'All',
						name: 'all',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'Salesforce',
						name: 'salesforce',
						type: 'boolean',
						default: false,
					},
				],
			},
		],
	},
] as INodeProperties[];
