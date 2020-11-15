import {
	INodeProperties,
} from 'n8n-workflow';

export const trackOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'track',
				],
			},
		},
		options: [
			{
				name: 'Event',
				value: 'event',
				description: 'Record the actions your users perform. Every action triggers an event, which can also have associated properties.',
			},
			{
				name: 'Page',
				value: 'page',
				description: 'Record page views on your website, along with optional extra information about the page being viewed.',
			},
		],
		default: 'event',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const trackFields = [

/* -------------------------------------------------------------------------- */
/*                                track:event                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'track',
				],
				operation: [
					'event',
				],
			},
		},
		required: false,
	},
	{
		displayName: 'Event',
		name: 'event',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'track',
				],
				operation: [
					'event',
				],
			},
		},
		description: 'Name of the action that a user has performed.',
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
					'track',
				],
				operation: [
					'event',
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
						description: 'Date the user’s account was first created at',
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
					{
						displayName: 'Custom Traits',
						name: 'customTraitsUi',
						placeholder: 'Add Custom Trait',
						type: 'fixedCollection',
						default: '',
						typeOptions: {
							multipleValues: true,
						},
						options: [
							{
								name: 'customTraitValues',
								displayName: 'Custom Traits',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
										description: '',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: '',
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
					'track',
				],
				operation: [
					'event',
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
					'track',
				],
				operation: [
					'event',
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
	{
		displayName: 'Properties',
		name: 'properties',
		placeholder: 'Add Properties',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: [
					'track',
				],
				operation: [
					'event',
				],
			},
		},
		default: {},
		options: [
			{
				name: 'propertiesUi',
				displayName: 'Properties',
				values: [
					{
						displayName: 'Revenue',
						name: 'revenue',
						type: 'number',
						typeOptions: {
							numberPrecision: 2,
						},
						default: 1,
						description: 'Amount of revenue an event resulted in. This should be a decimal value, so a shirt worth $19.99 would result in a revenue of 19.99.',
					},
					{
						displayName: 'Currency',
						name: 'currency',
						type: 'string',
						default: '',
						description: 'Currency of the revenue an event resulted in <p>This should be sent in the ISO 4127 format. If this is not set, we assume the revenue to be in US dollars.</p>',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'number',
						default: '',
						description: 'An abstract “value” to associate with an event. This is typically used in situations where the event doesn’t generate real-dollar revenue, but has an intrinsic value to a marketing team, like newsletter signups.',
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                track:page                                  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'track',
				],
				operation: [
					'page',
				],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'track',
				],
				operation: [
					'page',
				],
			},
		},
		description: 'Name of the page For example, most sites have a “Signup” page that can be useful to tag, so you can see users as they move through your funnel',
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
					'track',
				],
				operation: [
					'page',
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
						description: 'Date the user’s account was first created at',
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
					'track',
				],
				operation: [
					'page',
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
					'track',
				],
				operation: [
					'page',
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
	{
		displayName: 'Properties',
		name: 'properties',
		placeholder: 'Add Properties',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: [
					'track',
				],
				operation: [
					'page',
				],
			},
		},
		default: {},
		options: [
			{
				name: 'propertiesUi',
				displayName: 'Properties',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the page. This is reserved for future use.',
					},
					{
						displayName: 'Path',
						name: 'path',
						type: 'string',
						default: '',
						description: 'Path portion of the URL of the page. Equivalent to canonical path which defaults to location.pathname from the DOM API.',
					},
					{
						displayName: 'Referrer',
						name: 'referrer',
						type: 'string',
						default: '',
						description: 'Full URL of the previous page. Equivalent to document.referrer from the DOM API.',
					},
					{
						displayName: 'Search',
						name: 'search',
						type: 'string',
						default: '',
						description: 'Query string portion of the URL of the page. Equivalent to location.search from the DOM API.',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'Title of the page. Equivalent to document.title from the DOM API.',
					},
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						description: 'Full URL of the page. First we look for the canonical url. If the canonical url is not provided, we use location.href from the DOM API.',
					},
					{
						displayName: 'Keywords',
						name: 'keywords',
						type: 'string',
						default: '',
						description: 'A list/array of keywords describing the content of the page. The keywords would most likely be the same as, or similar to, the keywords you would find in an html meta tag for SEO purposes.',
					},
				],
			},
		],
	},
] as INodeProperties[];
