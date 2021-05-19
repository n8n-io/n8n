import {
	INodeProperties,
} from 'n8n-workflow';

import {
	blocks,
	text
} from './Blocks';

export const databaseRecordOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'databaseRecord',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a record in a database',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update record in a database',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const databaseRecordFields = [

	/* -------------------------------------------------------------------------- */
	/*                                databaseRecord:create                       */
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
					'databaseRecord',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The ID of the database that this databaseRecord belongs to.',
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'databaseRecord',
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
					'databaseRecord',
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
						description: 'List of databaseRecords that belong to another database. Multiples can be defined separated by comma.',
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
	...blocks('databaseRecord', 'create'),
	/* -------------------------------------------------------------------------- */
	/*                      databaseRecord:update                                 */
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
					'databaseRecord',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'The ID of the databaseRecord to update.',
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'databaseRecord',
				],
				operation: [
					'update',
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
					'databaseRecord',
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
						description: 'List of databaseRecords that belong to another database. Multiples can be defined separated by comma.',
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
] as INodeProperties[];
