import {
	INodeProperties,
} from 'n8n-workflow';

import {
	blocks,
	text
} from './Blocks';

export const pageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'page',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a page.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a page.',
			},
			{
				name: 'Query',
				value: 'query',
				description: 'Text search of pages',
			},
			{
				name: 'Update Properties',
				value: 'updateProperties',
				description: 'Update page properties.',
			},

		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const pageFields = [

	/* -------------------------------------------------------------------------- */
	/*                                page:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Parent Type',
		name: 'parentType',
		type: 'options',
		options: [
			{
				name: 'Database',
				value: 'database',
			},
			{
				name: 'Page',
				value: 'page',
			},
		],
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Parent Page ID',
		name: 'pageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'create',
				],
				parentType: [
					'page',
				],
			},
		},
		description: 'The ID of the parent page that this child page belongs to.',
	},
	{
		displayName: 'Database ID',
		name: 'databaseId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getDatabases',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'create',
				],
				parentType: [
					'database',
				],
			},
		},
		description: 'The ID of the database that this page belongs to.',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'create',
				],
				parentType: [
					'page',
				],
			},
		},
		description: 'Page title. Appears at the top of the page and can be found via Quick Find.',
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'create',
				],
			},
		},
		default: true,
		description: 'When set to true a simplify version of the response will be used else the raw data.',
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
				resource: [
					'page',
				],
				operation: [
					'create',
				],
				parentType: [
					'database',
				],
			},
		},
		default: '',
		placeholder: 'Add Property',
		options: [
			{
				name: 'propertyValues',
				displayName: 'Property',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getDatabaseProperties',
							loadOptionsDependsOn: [
								'databaseId',
							],
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
								type: [
									'title',
								],
							},
						},
						default: '',
					},
					{
						displayName: 'Only Content',
						name: 'onlyContent',
						type: 'boolean',
						displayOptions: {
							show: {
								type: [
									'rich_text',
								],
							},
						},
						default: true,
					},
					{
						displayName: 'Text Content',
						name: 'content',
						type: 'string',
						displayOptions: {
							show: {
								type: [
									'rich_text',
								],
								onlyContent: [
									true,
								],
							},
						},
						default: '',
					},
					...text({
						show: {
							type: [
								'rich_text',
							],
							onlyContent: [
								false,
							],
						},
					}),
					{
						displayName: 'Phone Number',
						name: 'phoneValue',
						type: 'string',
						displayOptions: {
							show: {
								type: [
									'phone_number',
								],
							},
						},
						default: '',
						description: `Phone number. No structure is enforced.`,
					},
					{
						displayName: 'Options',
						name: 'multiSelectValue',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getPropertySelectValues',
						},
						displayOptions: {
							show: {
								type: [
									'multi_select',
								],
							},
						},
						default: [],
						description: `Name of the options you want to set.
						Multiples can be defined separated by comma.`,
					},
					{
						displayName: 'Option',
						name: 'selectValue',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getPropertySelectValues',
						},
						displayOptions: {
							show: {
								type: [
									'select',
								],
							},
						},
						default: '',
						description: `Name of the option you want to set.`,
					},
					{
						displayName: 'Email',
						name: 'emailValue',
						type: 'string',
						displayOptions: {
							show: {
								type: [
									'email',
								],
							},
						},
						default: '',
						description: 'Email address.',
					},
					{
						displayName: 'URL',
						name: 'urlValue',
						type: 'string',
						displayOptions: {
							show: {
								type: [
									'url',
								],
							},
						},
						default: '',
						description: 'Web address.',
					},
					{
						displayName: 'User IDs',
						name: 'peopleValue',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getUsers',
						},
						displayOptions: {
							show: {
								type: [
									'people',
								],
							},
						},
						default: [],
						description: 'List of users. Multiples can be defined separated by comma.',
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
								type: [
									'relation',
								],
							},
						},
						default: '',
						description: 'List of pages that belong to another database. Multiples can be defined separated by comma.',
					},
					{
						displayName: 'Checkbox',
						name: 'checkboxValue',
						displayOptions: {
							show: {
								type: [
									'checkbox',
								],
							},
						},
						type: 'boolean',
						default: false,
						description: `
						Whether or not the checkbox is checked.</br>
						true represents checked.</br>
						false represents unchecked.
						`,
					},
					{
						displayName: 'Number',
						name: 'numberValue',
						displayOptions: {
							show: {
								type: [
									'number',
								],
							},
						},
						type: 'number',
						default: 0,
						description: 'Number value.',
					},
					{
						displayName: 'Range',
						name: 'range',
						displayOptions: {
							show: {
								type: [
									'date',
								],
							},
						},
						type: 'boolean',
						default: false,
						description: 'Weather or not you want to define a date range.',
					},
					{
						displayName: 'Date',
						name: 'date',
						displayOptions: {
							show: {
								range: [
									false,
								],
								type: [
									'date',
								],
							},
						},
						type: 'dateTime',
						default: '',
						description: 'An ISO 8601 format date, with optional time.',
					},
					{
						displayName: 'Date Start',
						name: 'dateStart',
						displayOptions: {
							show: {
								range: [
									true,
								],
								type: [
									'date',
								],
							},
						},
						type: 'dateTime',
						default: '',
						description: 'An ISO 8601 format date, with optional time.',
					},
					{
						displayName: 'Date End',
						name: 'dateEnd',
						displayOptions: {
							show: {
								range: [
									true,
								],
								type: [
									'date',
								],
							},
						},
						type: 'dateTime',
						default: '',
						description: `
						An ISO 8601 formatted date, with optional time. Represents the end of a date range.`,
					},
				],
			},
		],
	},
	...blocks('page', 'create'),
	/* -------------------------------------------------------------------------- */
	/*                                page:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Page ID',
		name: 'pageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'get',
				],
			},
		},
		default: true,
		description: 'When set to true a simplify version of the response will be used else the raw data.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                page:updateProperties                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Page ID',
		name: 'pageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'updateProperties',
				],
			},
		},
		description: 'The ID of the page to update.',
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'updateProperties',
				],
			},
		},
		default: true,
		description: 'When set to true a simplify version of the response will be used else the raw data.',
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
				resource: [
					'page',
				],
				operation: [
					'updateProperties',
				],
			},
		},
		default: '',
		placeholder: 'Add Property',
		options: [
			{
				name: 'propertyValues',
				displayName: 'Property',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getDatbaseIdFromPage',
							loadOptionsDependsOn: [
								'pageId',
							],
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
								type: [
									'title',
								],
							},
						},
						default: '',
					},
					{
						displayName: 'Only Content',
						name: 'onlyContent',
						type: 'boolean',
						displayOptions: {
							show: {
								type: [
									'rich_text',
								],
							},
						},
						default: true,
					},
					{
						displayName: 'Text Content',
						name: 'content',
						type: 'string',
						displayOptions: {
							show: {
								type: [
									'rich_text',
								],
								onlyContent: [
									true,
								],
							},
						},
						default: '',
					},
					...text({
						show: {
							type: [
								'rich_text',
							],
							onlyContent: [
								false,
							],
						},
					}),
					{
						displayName: 'Phone Number',
						name: 'phoneValue',
						type: 'string',
						displayOptions: {
							show: {
								type: [
									'phone_number',
								],
							},
						},
						default: '',
						description: `Phone number. No structure is enforced.`,
					},
					{
						displayName: 'Options',
						name: 'multiSelectValue',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getPropertySelectValues',
						},
						displayOptions: {
							show: {
								type: [
									'multi_select',
								],
							},
						},
						default: [],
						description: `Name of the options you want to set.
						Multiples can be defined separated by comma.`,
					},
					{
						displayName: 'Option',
						name: 'selectValue',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getPropertySelectValues',
						},
						displayOptions: {
							show: {
								type: [
									'select',
								],
							},
						},
						default: '',
						description: `Name of the option you want to set.`,
					},
					{
						displayName: 'Email',
						name: 'emailValue',
						type: 'string',
						displayOptions: {
							show: {
								type: [
									'email',
								],
							},
						},
						default: '',
						description: 'Email address.',
					},
					{
						displayName: 'URL',
						name: 'urlValue',
						type: 'string',
						displayOptions: {
							show: {
								type: [
									'url',
								],
							},
						},
						default: '',
						description: 'Web address.',
					},
					{
						displayName: 'User IDs',
						name: 'peopleValue',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getUsers',
						},
						displayOptions: {
							show: {
								type: [
									'people',
								],
							},
						},
						default: [],
						description: 'List of users. Multiples can be defined separated by comma.',
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
								type: [
									'relation',
								],
							},
						},
						default: '',
						description: 'List of pages that belong to another database. Multiples can be defined separated by comma.',
					},
					{
						displayName: 'Checkbox',
						name: 'checkboxValue',
						displayOptions: {
							show: {
								type: [
									'checkbox',
								],
							},
						},
						type: 'boolean',
						default: false,
						description: `
						Whether or not the checkbox is checked.</br>
						true represents checked.</br>
						false represents unchecked.
						`,
					},
					{
						displayName: 'Number',
						name: 'numberValue',
						displayOptions: {
							show: {
								type: [
									'number',
								],
							},
						},
						type: 'number',
						default: 0,
						description: 'Number value.',
					},
					{
						displayName: 'Range',
						name: 'range',
						displayOptions: {
							show: {
								type: [
									'date',
								],
							},
						},
						type: 'boolean',
						default: false,
						description: 'Weather or not you want to define a date range.',
					},
					{
						displayName: 'Date',
						name: 'date',
						displayOptions: {
							show: {
								range: [
									false,
								],
								type: [
									'date',
								],
							},
						},
						type: 'dateTime',
						default: '',
						description: 'An ISO 8601 format date, with optional time.',
					},
					{
						displayName: 'Date Start',
						name: 'dateStart',
						displayOptions: {
							show: {
								range: [
									true,
								],
								type: [
									'date',
								],
							},
						},
						type: 'dateTime',
						default: '',
						description: 'An ISO 8601 format date, with optional time.',
					},
					{
						displayName: 'Date End',
						name: 'dateEnd',
						displayOptions: {
							show: {
								range: [
									true,
								],
								type: [
									'date',
								],
							},
						},
						type: 'dateTime',
						default: '',
						description: `
						An ISO 8601 formatted date, with optional time. Represents the end of a date range.`,
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                page:query                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'query',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'query',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'query',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'query',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Filters',
				name: 'filter',
				placeholder: 'Add Filter',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						displayName: 'Filter',
						name: 'filters',
						values: [
							{
								displayName: 'Property',
								name: 'property',
								type: 'options',
								options: [
									{
										name: 'Object',
										value: 'object',
									},
								],
								default: 'object',
								description: 'The name of the property to filter by.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'options',
								options: [
									{
										name: 'Database',
										value: 'database',
									},
									{
										name: 'Page',
										value: 'page',
									},
								],
								default: '',
								description: 'The value of the property to filter by.',
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
					multipleValues: false,
				},
				default: {},
				options: [
					{
						displayName: 'Sort',
						name: 'sortValue',
						values: [
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
								description: 'The direction to sort.',
							},
							{
								displayName: 'Timestamp',
								name: 'timestamp',
								type: 'options',
								options: [
									{
										name: 'Last Edited Time',
										value: 'last_edited_time',
									},
								],
								default: 'last_edited_time',
								description: `The name of the timestamp to sort against.`,
							},
						],
					},
				],
			},
		],
	},
] as INodeProperties[];
