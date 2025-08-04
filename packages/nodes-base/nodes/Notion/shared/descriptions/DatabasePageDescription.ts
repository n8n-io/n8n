import type { INodeProperties } from 'n8n-workflow';

import { blocks, text } from './Blocks';
import { filters } from './Filters';
import {
	databaseUrlExtractionRegexp,
	databaseUrlValidationRegexp,
	databasePageUrlExtractionRegexp,
	databasePageUrlValidationRegexp,
	idExtractionRegexp,
	idValidationRegexp,
} from '../constants';
import { getConditions, getSearchFilters } from '../GenericFunctions';

export const databasePageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['databasePage'],
			},
			hide: {
				'@version': [1],
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
				description: 'Get many pages in a database',
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
				'@version': [1],
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
				description: 'Get many pages in a database',
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

export const databasePageFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                databasePage:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database',
		name: 'databaseId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Database',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Database...',
				typeOptions: {
					searchListMethod: 'getDatabases',
					searchable: true,
				},
			},
			{
				displayName: 'Link',
				name: 'url',
				type: 'string',
				placeholder:
					'https://www.notion.so/0fe2f7de558b471eab07e9d871cdf4a9?v=f2d424ba0c404733a3f500c78c881610',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: databaseUrlValidationRegexp,
							errorMessage: 'Not a valid Notion Database URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: databaseUrlExtractionRegexp,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'ab1545b247fb49fa92d6f4b49f4d8116',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: idValidationRegexp,
							errorMessage: 'Not a valid Notion Database ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: idExtractionRegexp,
				},
				url: '=https://www.notion.so/{{$value.replace(/-/g, "")}}',
			},
		],
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['create'],
			},
		},
		description: 'The Notion Database to operate on',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['create'],
			},
			hide: {
				'@version': [1],
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
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
							'Name of the options you want to set. Multiples can be defined separated by comma. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
							'Name of the option you want to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Status Name or ID',
						name: 'statusValue',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getPropertySelectValues',
						},
						displayOptions: {
							show: {
								type: ['status'],
							},
						},
						default: '',
						description:
							'Name of the option you want to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
							'List of users. Multiples can be defined separated by comma. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
							'Time zone to use. By default n8n timezone is used. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
								type: ['files'],
							},
							hide: {
								'@version': [1],
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['create'],
			},
		},
		default: {},
		placeholder: 'Add option',
		options: [
			{
				displayName: 'Icon Type',
				name: 'iconType',
				type: 'options',
				options: [
					{
						name: 'Emoji',
						value: 'emoji',
						description: 'Use an Emoji for the icon',
					},
					{
						name: 'File',
						value: 'file',
						description: 'Use a file for the icon',
					},
				],
				default: 'emoji',
				description: 'The icon type for the database page, Either a URL or an Emoji',
			},
			{
				displayName: 'Icon',
				name: 'icon',
				type: 'string',
				default: '',
				description: 'Emoji or File URL to use as the icon',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                      databasePage:update                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database Page',
		name: 'pageId',
		type: 'resourceLocator',
		default: { mode: 'url', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Link',
				name: 'url',
				type: 'string',
				placeholder: 'https://www.notion.so/My-Database-Page-b4eeb113e118403ba450af65ac25f0b9',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: databasePageUrlValidationRegexp,
							errorMessage: 'Not a valid Notion Database Page URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: databasePageUrlExtractionRegexp,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'ab1545b247fb49fa92d6f4b49f4d8116',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: idValidationRegexp,
							errorMessage: 'Not a valid Notion Database Page ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: idExtractionRegexp,
				},
				url: '=https://www.notion.so/{{$value.replace(/-/g, "")}}',
			},
		],
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['update'],
			},
		},
		description: 'The Notion Database Page to update',
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
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
							'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
						displayName: 'Status Name or ID',
						name: 'statusValue',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getDatabaseOptionsFromPage',
						},
						displayOptions: {
							show: {
								type: ['status'],
							},
						},
						default: '',
						description:
							'Name of the option you want to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
							'List of users. Multiples can be defined separated by comma. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
							'Time zone to use. By default n8n timezone is used. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
								type: ['files'],
							},
							hide: {
								'@version': [1],
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['update'],
			},
		},
		default: {},
		placeholder: 'Add option',
		options: [
			{
				displayName: 'Icon Type',
				name: 'iconType',
				type: 'options',
				options: [
					{
						name: 'Emoji',
						value: 'emoji',
						description: 'Use an Emoji for the icon',
					},
					{
						name: 'File',
						value: 'file',
						description: 'Use a file for the icon',
					},
				],
				default: 'emoji',
				description: 'The icon type for the database page, Either a URL or an Emoji',
			},
			{
				displayName: 'Icon',
				name: 'icon',
				type: 'string',
				default: '',
				description: 'Emoji or File URL to use as the icon',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                databasePage:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database Page',
		name: 'pageId',
		type: 'resourceLocator',
		default: { mode: 'url', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Link',
				name: 'url',
				type: 'string',
				placeholder: 'https://www.notion.so/My-Database-Page-b4eeb113e118403ba450af65ac25f0b9',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: databasePageUrlValidationRegexp,
							errorMessage: 'Not a valid Notion Database Page URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: databasePageUrlExtractionRegexp,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'ab1545b247fb49fa92d6f4b49f4d8116',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: idValidationRegexp,
							errorMessage: 'Not a valid Notion Database Page ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: idExtractionRegexp,
				},
				url: '=https://www.notion.so/{{$value.replace(/-/g, "")}}',
			},
		],
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['get'],
			},
			hide: {
				'@version': [1],
			},
		},
		description: 'The Notion Database Page to get',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['get'],
			},
			hide: {
				'@version': [1],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	/* -------------------------------------------------------------------------- */
	/*                                databasePage:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database',
		name: 'databaseId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Database',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Database...',
				typeOptions: {
					searchListMethod: 'getDatabases',
					searchable: true,
				},
			},
			{
				displayName: 'Link',
				name: 'url',
				type: 'string',
				placeholder:
					'https://www.notion.so/0fe2f7de558b471eab07e9d871cdf4a9?v=f2d424ba0c404733a3f500c78c881610',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: databasePageUrlValidationRegexp,
							errorMessage: 'Not a valid Notion Database Page URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: databasePageUrlExtractionRegexp,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'ab1545b247fb49fa92d6f4b49f4d8116',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: idValidationRegexp,
							errorMessage: 'Not a valid Notion Database Page ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: idExtractionRegexp,
				},
				url: '=https://www.notion.so/{{$value.replace(/-/g, "")}}',
			},
		],
		displayOptions: {
			show: {
				resource: ['databasePage'],
				operation: ['getAll'],
			},
		},
		description: 'The Notion Database to operate on',
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
						'/resource': ['databasePage'],
						'/operation': ['getAll'],
					},
					hide: {
						'@version': [1],
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
						'@version': [1],
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
									'The name of the property to filter by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
