import { INodeProperties } from 'n8n-workflow';

import { getConditions, getSearchFilters } from './GenericFunctions';

import { blocks, text } from './Blocks';

import { filters } from './Filters';

export const databasePageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				version: [2],
				resource: ['databasePage'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a pages in a database',
				action: 'Create a database page',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a page in a database',
				action: 'Get a database page',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all pages in a database',
				action: 'Get many database pages',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update pages in a database',
				action: 'Update a database page',
			},
		],
		default: 'create',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				version: [1],
				resource: ['databasePage'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a pages in a database',
				action: 'Create a database page',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all pages in a database',
				action: 'Get many database pages',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update pages in a database',
				action: 'Update a database page',
			},
		],
		default: 'create',
	},
];

export const databasePageFields = [
	/* -------------------------------------------------------------------------- */
	/*                                databasePage:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database Name or ID',
		name: 'databaseId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getDatabases',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['create'],
			},
		},
		description:
			"The Database Page URL from Notion's 'copy link' functionality (or just the ID contained within the URL). Choose from the list, or specify an ID using an <a href=\"https://docs.n8n.io/code-examples/expressions/\">expression</a>.",
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				version: [2],
				resource: ['databasePage'],
				operation: ['create'],
			},
		},
		description: 'Page title. Appears at the top of the page and can be found via Quick Find.',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['create'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Properties',
		name: 'propertiesUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['create'],
			},
		},
		default: {},
		placeholder: 'Add Property',
		options: [
			{
				name: 'propertyValues',
				displayName: 'Property',
				values: [
					{
						displayName: 'Key Name or ID',
						name: 'key',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getDatabaseProperties',
							loadOptionsDependsOn: ['databaseId'],
						},
						default: '',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'hidden',
						default: '={{$parameter["&key"].split("|")[1]}}',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						displayOptions: {
							show: {
								type: ['title'],
							},
						},
						default: '',
					},
					{
						displayName: 'Rich Text',
						name: 'richText',
						type: 'boolean',
						displayOptions: {
							show: {
								type: ['rich_text'],
							},
						},
						default: false,
					},
					{
						displayName: 'Text',
						name: 'textContent',
						type: 'string',
						displayOptions: {
							show: {
								type: ['rich_text'],
								richText: [false],
							},
						},
						default: '',
					},
					...text({
						show: {
							type: ['rich_text'],
							richText: [true],
						},
					}),
					{
						displayName: 'Phone Number',
						name: 'phoneValue',
						type: 'string',
						displayOptions: {
							show: {
								type: ['phone_number'],
							},
						},
						default: '',
						description: 'Phone number. No structure is enforced.',
					},
					{
						displayName: 'Option Names or IDs',
						name: 'multiSelectValue',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getPropertySelectValues',
						},
						displayOptions: {
							show: {
								type: ['multi_select'],
							},
						},
						default: [],
						description:
							'Name of the options you want to set. Multiples can be defined separated by comma. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Option Name or ID',
						name: 'selectValue',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getPropertySelectValues',
						},
						displayOptions: {
							show: {
								type: ['select'],
							},
						},
						default: '',
						description:
							'Name of the option you want to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Email',
						name: 'emailValue',
						type: 'string',
						displayOptions: {
							show: {
								type: ['email'],
							},
						},
						default: '',
						description: 'Email address',
					},
					{
						displayName: 'Ignore If Empty',
						name: 'ignoreIfEmpty',
						type: 'boolean',
						displayOptions: {
							show: {
								type: ['url'],
							},
						},
						default: false,
					},
					{
						displayName: 'URL',
						name: 'urlValue',
						type: 'string',
						displayOptions: {
							show: {
								type: ['url'],
							},
						},
						default: '',
						description: 'Web address',
					},
					{
						displayName: 'User Names or IDs',
						name: 'peopleValue',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getUsers',
						},
						displayOptions: {
							show: {
								type: ['people'],
							},
						},
						default: [],
						description:
							'List of users. Multiples can be defined separated by comma. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Relation IDs',
						name: 'relationValue',
						type: 'string',
						typeOptions: {
							multipleValues: true,
						},
						displayOptions: {
							show: {
								type: ['relation'],
							},
						},
						default: [],
						description:
							'List of databases that belong to another database. Multiples can be defined separated by comma.',
					},
					{
						displayName: 'Checked',
						name: 'checkboxValue',
						displayOptions: {
							show: {
								type: ['checkbox'],
							},
						},
						type: 'boolean',
						default: false,
						description:
							'Whether or not the checkbox is checked. <code>true</code> represents checked. <code>false</code> represents unchecked.',
					},
					{
						displayName: 'Number',
						name: 'numberValue',
						displayOptions: {
							show: {
								type: ['number'],
							},
						},
						type: 'number',
						default: 0,
						description: 'Number value',
					},
					{
						displayName: 'Range',
						name: 'range',
						displayOptions: {
							show: {
								type: ['date'],
							},
						},
						type: 'boolean',
						default: false,
						description: 'Whether or not you want to define a date range',
					},
					{
						displayName: 'Include Time',
						name: 'includeTime',
						displayOptions: {
							show: {
								type: ['date'],
							},
						},
						type: 'boolean',
						default: true,
						description: 'Whether or not to include the time in the date',
					},
					{
						displayName: 'Date',
						name: 'date',
						displayOptions: {
							show: {
								range: [false],
								type: ['date'],
							},
						},
						type: 'dateTime',
						default: '',
						description: 'An ISO 8601 format date, with optional time',
					},
					{
						displayName: 'Date Start',
						name: 'dateStart',
						displayOptions: {
							show: {
								range: [true],
								type: ['date'],
							},
						},
						type: 'dateTime',
						default: '',
						description: 'An ISO 8601 format date, with optional time',
					},
					{
						displayName: 'Date End',
						name: 'dateEnd',
						displayOptions: {
							show: {
								range: [true],
								type: ['date'],
							},
						},
						type: 'dateTime',
						default: '',
						description:
							'An ISO 8601 formatted date, with optional time. Represents the end of a date range.',
					},
					{
						displayName: 'Timezone Name or ID',
						name: 'timezone',
						type: 'options',
						displayOptions: {
							show: {
								type: ['date'],
							},
						},
						typeOptions: {
							loadOptionsMethod: 'getTimezones',
						},
						default: 'default',
						description:
							'Time zone to use. By default n8n timezone is used. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'File URLs',
						name: 'fileUrls',
						placeholder: 'Add File',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
							sortable: true,
						},
						displayOptions: {
							show: {
								'/version': [2],
								type: ['files'],
							},
						},
						default: {},
						options: [
							{
								name: 'fileUrl',
								displayName: 'File',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'File URL',
										name: 'url',
										type: 'string',
										default: '',
										description: 'Link to externally hosted file',
									},
								],
							},
						],
					},
				],
			},
		],
	},
	...blocks('databasePage', 'create'),
	/* -------------------------------------------------------------------------- */
	/*                      databasePage:update                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database Page Link or ID',
		name: 'pageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['update'],
			},
		},
		description:
			"The Database Page URL from Notion's 'copy link' functionality (or just the ID contained within the URL)",
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['update'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Properties',
		name: 'propertiesUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['update'],
			},
		},
		default: {},
		placeholder: 'Add Property',
		options: [
			{
				name: 'propertyValues',
				displayName: 'Property',
				values: [
					{
						displayName: 'Key Name or ID',
						name: 'key',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getDatabaseIdFromPage',
							loadOptionsDependsOn: ['pageId'],
						},
						default: '',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'hidden',
						default: '={{$parameter["&key"].split("|")[1]}}',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						displayOptions: {
							show: {
								type: ['title'],
							},
						},
						default: '',
					},
					{
						displayName: 'Rich Text',
						name: 'richText',
						type: 'boolean',
						displayOptions: {
							show: {
								type: ['rich_text'],
							},
						},
						default: false,
					},
					{
						displayName: 'Text',
						name: 'textContent',
						type: 'string',
						displayOptions: {
							show: {
								type: ['rich_text'],
								richText: [false],
							},
						},
						default: '',
					},
					...text({
						show: {
							type: ['rich_text'],
							richText: [true],
						},
					}),
					{
						displayName: 'Phone Number',
						name: 'phoneValue',
						type: 'string',
						displayOptions: {
							show: {
								type: ['phone_number'],
							},
						},
						default: '',
						description: 'Phone number. No structure is enforced.',
					},
					{
						displayName: 'Option Names or IDs',
						name: 'multiSelectValue',
						type: 'multiOptions',
						description:
							'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getDatabaseOptionsFromPage',
						},
						displayOptions: {
							show: {
								type: ['multi_select'],
							},
						},
						default: [],
					},
					{
						displayName: 'Option Name or ID',
						name: 'selectValue',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getDatabaseOptionsFromPage',
						},
						displayOptions: {
							show: {
								type: ['select'],
							},
						},
						default: '',
					},
					{
						displayName: 'Email',
						name: 'emailValue',
						type: 'string',
						displayOptions: {
							show: {
								type: ['email'],
							},
						},
						default: '',
					},
					{
						displayName: 'Ignore If Empty',
						name: 'ignoreIfEmpty',
						type: 'boolean',
						displayOptions: {
							show: {
								type: ['url'],
							},
						},
						default: false,
					},
					{
						displayName: 'URL',
						name: 'urlValue',
						type: 'string',
						displayOptions: {
							show: {
								type: ['url'],
							},
						},
						default: '',
						description: 'Web address',
					},
					{
						displayName: 'User Names or IDs',
						name: 'peopleValue',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getUsers',
						},
						displayOptions: {
							show: {
								type: ['people'],
							},
						},
						default: [],
						description:
							'List of users. Multiples can be defined separated by comma. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Relation IDs',
						name: 'relationValue',
						type: 'string',
						typeOptions: {
							multipleValues: true,
						},
						displayOptions: {
							show: {
								type: ['relation'],
							},
						},
						default: [],
						description:
							'List of databases that belong to another database. Multiples can be defined separated by comma.',
					},
					{
						displayName: 'Checked',
						name: 'checkboxValue',
						displayOptions: {
							show: {
								type: ['checkbox'],
							},
						},
						type: 'boolean',
						default: false,
						description:
							'Whether or not the checkbox is checked. <code>true</code> represents checked. <code>false</code> represents unchecked.',
					},
					{
						displayName: 'Number',
						name: 'numberValue',
						displayOptions: {
							show: {
								type: ['number'],
							},
						},
						type: 'number',
						default: 0,
						description: 'Number value',
					},
					{
						displayName: 'Range',
						name: 'range',
						displayOptions: {
							show: {
								type: ['date'],
							},
						},
						type: 'boolean',
						default: false,
						description: 'Whether or not you want to define a date range',
					},
					{
						displayName: 'Include Time',
						name: 'includeTime',
						displayOptions: {
							show: {
								type: ['date'],
							},
						},
						type: 'boolean',
						default: true,
						description: 'Whether or not to include the time in the date',
					},
					{
						displayName: 'Date',
						name: 'date',
						displayOptions: {
							show: {
								range: [false],
								type: ['date'],
							},
						},
						type: 'dateTime',
						default: '',
						description: 'An ISO 8601 format date, with optional time',
					},
					{
						displayName: 'Date Start',
						name: 'dateStart',
						displayOptions: {
							show: {
								range: [true],
								type: ['date'],
							},
						},
						type: 'dateTime',
						default: '',
						description: 'An ISO 8601 format date, with optional time',
					},
					{
						displayName: 'Date End',
						name: 'dateEnd',
						displayOptions: {
							show: {
								range: [true],
								type: ['date'],
							},
						},
						type: 'dateTime',
						default: '',
						description:
							'An ISO 8601 formatted date, with optional time. Represents the end of a date range.',
					},
					{
						displayName: 'Timezone Name or ID',
						name: 'timezone',
						type: 'options',
						displayOptions: {
							show: {
								type: ['date'],
							},
						},
						typeOptions: {
							loadOptionsMethod: 'getTimezones',
						},
						default: 'default',
						description:
							'Time zone to use. By default n8n timezone is used. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'File URLs',
						name: 'fileUrls',
						placeholder: 'Add File',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
							sortable: true,
						},
						displayOptions: {
							show: {
								'/version': [2],
								type: ['files'],
							},
						},
						default: {},
						options: [
							{
								name: 'fileUrl',
								displayName: 'File',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'File URL',
										name: 'url',
										type: 'string',
										default: '',
										description: 'Link to externally hosted file',
									},
								],
							},
						],
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                databasePage:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database Page Link or ID',
		name: 'pageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				version: [2],
				resource: ['databasePage'],
				operation: ['get'],
			},
		},
		description:
			"The Database Page URL from Notion's 'copy link' functionality (or just the ID contained within the URL)",
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				version: [2],
				resource: ['databasePage'],
				operation: ['get'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	/* -------------------------------------------------------------------------- */
	/*                                databasePage:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database Name or ID',
		name: 'databaseId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getDatabases',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['databasePage'],
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
				resource: ['databasePage'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['getAll'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	...getSearchFilters('databasePage'),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['databasePage'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Download Files',
				name: 'downloadFiles',
				type: 'boolean',
				displayOptions: {
					show: {
						'/version': [2],
						'/resource': ['databasePage'],
						'/operation': ['getAll'],
					},
				},
				default: false,
				description: "Whether to download a file if a database's field contains it",
			},
			{
				displayName: 'Filters',
				name: 'filter',
				placeholder: 'Add Filter',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				displayOptions: {
					show: {
						'/version': [1],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Single Condition',
						name: 'singleCondition',
						values: [...filters(getConditions())],
					},
					{
						displayName: 'Multiple Condition',
						name: 'multipleCondition',
						values: [
							{
								displayName: 'Condition',
								name: 'condition',
								placeholder: 'Add Condition',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								options: [
									{
										displayName: 'OR',
										name: 'or',
										values: [...filters(getConditions())],
									},
									{
										displayName: 'AND',
										name: 'and',
										values: [...filters(getConditions())],
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Sort',
				name: 'sort',
				placeholder: 'Add Sort',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						displayName: 'Sort',
						name: 'sortValue',
						values: [
							{
								displayName: 'Timestamp',
								name: 'timestamp',
								type: 'boolean',
								default: false,
								description: "Whether or not to use the record's timestamp to sort the response",
							},
							{
								displayName: 'Property Name or ID',
								name: 'key',
								type: 'options',
								displayOptions: {
									show: {
										timestamp: [false],
									},
								},
								typeOptions: {
									loadOptionsMethod: 'getFilterProperties',
									loadOptionsDependsOn: ['datatabaseId'],
								},
								default: '',
								description:
									'The name of the property to filter by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Property Name',
								name: 'key',
								type: 'options',
								options: [
									{
										name: 'Created Time',
										value: 'created_time',
									},
									{
										name: 'Last Edited Time',
										value: 'last_edited_time',
									},
								],
								displayOptions: {
									show: {
										timestamp: [true],
									},
								},
								default: '',
								description: 'The name of the property to filter by',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'hidden',
								displayOptions: {
									show: {
										timestamp: [true],
									},
								},
								default: '={{$parameter["&key"].split("|")[1]}}',
							},
							{
								displayName: 'Direction',
								name: 'direction',
								type: 'options',
								options: [
									{
										name: 'Ascending',
										value: 'ascending',
									},
									{
										name: 'Descending',
										value: 'descending',
									},
								],
								default: '',
								description: 'The direction to sort',
							},
						],
					},
				],
			},
		],
	},
] as INodeProperties[];
