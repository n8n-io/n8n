import {
	INodeProperties,
} from 'n8n-workflow';

import {
	blocks,
	text,
} from './Blocks';

import {
	filters,
} from './Filters';

export const databasePageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'databasePage',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a pages in a database',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all pages in a database',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update pages in a database',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const databasePageFields = [

	/* -------------------------------------------------------------------------- */
	/*                                databasePage:create                       */
	/* -------------------------------------------------------------------------- */
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
					'databasePage',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The ID of the database that this databasePage belongs to.',
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'databasePage',
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
					'databasePage',
				],
				operation: [
					'create',
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
						displayName: 'Rich Text',
						name: 'richText',
						type: 'boolean',
						displayOptions: {
							show: {
								type: [
									'rich_text',
								],
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
								type: [
									'rich_text',
								],
								richText: [
									false,
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
							richText: [
								true,
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
						default: [],
						description: 'List of databases that belong to another database. Multiples can be defined separated by comma.',
					},
					{
						displayName: 'Checked',
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
						displayName: 'Include Time',
						name: 'includeTime',
						displayOptions: {
							show: {
								type: [
									'date',
								],
							},
						},
						type: 'boolean',
						default: true,
						description: 'Weather or not to include the time in the date.',
					},
					{
						displayName: 'Timezone',
						name: 'timezone',
						type: 'options',
						required: false,
						typeOptions: {
							show: {
								type: [
									'date',
								],
							},
							loadOptionsMethod: 'getTimezones',
						},
						default: '',
						description: 'Time zone used in the response. By default n8n timezone is used.',
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
	...blocks('databasePage', 'create'),
	/* -------------------------------------------------------------------------- */
	/*                      databasePage:update                                 */
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
					'databasePage',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'The ID of the databasePage to update.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'databasePage',
				],
				operation: [
					'update',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
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
					'databasePage',
				],
				operation: [
					'update',
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
							loadOptionsMethod: 'getDatabaseIdFromPage',
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
						displayName: 'Rich Text',
						name: 'richText',
						type: 'boolean',
						displayOptions: {
							show: {
								type: [
									'rich_text',
								],
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
								type: [
									'rich_text',
								],
								richText: [
									false,
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
							richText: [
								true,
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
							loadOptionsMethod: 'getDatabaseOptionsFromPage',
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
							loadOptionsMethod: 'getDatabaseOptionsFromPage',
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
						default: [],
						description: 'List of databases that belong to another database. Multiples can be defined separated by comma.',
					},
					{
						displayName: 'Checked',
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
						displayName: 'Include Time',
						name: 'includeTime',
						displayOptions: {
							show: {
								type: [
									'date',
								],
							},
						},
						type: 'boolean',
						default: true,
						description: 'Weather or not to include the time in the date.',
					},
					{
						displayName: 'Timezone',
						name: 'timezone',
						type: 'options',
						required: false,
						typeOptions: {
							show: {
								type: [
									'date',
								],
							},
							loadOptionsMethod: 'getTimezones',
						},
						default: '',
						description: 'Time zone used in the response. By default n8n timezone is used.',
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
	/*                                databasePage:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database ID',
		name: 'databaseId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDatabases',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'databasePage',
				],
				operation: [
					'getAll',
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
					'databasePage',
				],
				operation: [
					'getAll',
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
					'databasePage',
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
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'databasePage',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: true,
		description: 'When set to true a simplify version of the response will be used else the raw data.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'databasePage',
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
						displayName: 'Single Condition',
						name: 'singleCondition',
						values: [
							...filters,
						],
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
										values: [
											...filters,
										],
									},
									{
										displayName: 'AND',
										name: 'and',
										values: [
											...filters,
										],
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
								description: `Whether or not to use the record's timestamp to sort the response.`,
							},
							{
								displayName: 'Property Name',
								name: 'key',
								type: 'options',
								displayOptions: {
									show: {
										timestamp: [
											false,
										],
									},
								},
								typeOptions: {
									loadOptionsMethod: 'getFilterProperties',
									loadOptionsDependsOn: [
										'datatabaseId',
									],
								},
								default: '',
								description: 'The name of the property to filter by.',
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
										timestamp: [
											true,
										],
									},
								},
								default: '',
								description: 'The name of the property to filter by.',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'hidden',
								displayOptions: {
									show: {
										timestamp: [
											true,
										],
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
								description: 'The direction to sort.',
							},
						],
					},
				],
			},
		],
	},
] as INodeProperties[];
