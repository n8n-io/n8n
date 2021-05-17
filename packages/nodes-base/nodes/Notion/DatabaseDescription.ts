import {
	INodeProperties,
} from 'n8n-workflow';
import { getFilters } from './GenericFunctions';

export const databaseOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'database',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a database.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all databases.',
			},
			{
				name: 'Query',
				value: 'query',
				description: 'Query a database.',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const databaseFields = [

	/* -------------------------------------------------------------------------- */
	/*                                database:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database ID',
		name: 'databaseId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'get',
				],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                database:query                              */
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
					'database',
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
					'database',
				],
				operation: [
					'query',
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
					'database',
				],
				operation: [
					'query',
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 10,
		},
		default: 5,
		description: 'How many results to return.',
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'query',
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
					'query',
				],
				resource: [
					'database',
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
							{
								displayName: 'Property Name',
								name: 'key',
								type: 'options',
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
								displayName: 'Type',
								name: 'type',
								type: 'hidden',
								default: '={{$parameter["&key"].split("|")[1]}}',
							},
							...getFilters(),
							{
								displayName: 'Title',
								name: 'titleValue',
								type: 'string',
								displayOptions: {
									show: {
										type: [
											'title',
										],
									},
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
										],
									},
								},
								default: '',
							},
							{
								displayName: 'Text',
								name: 'richTextValue',
								type: 'string',
								displayOptions: {
									show: {
										type: [
											'rich_text',
										],
									},
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
										],
									},
								},
								default: '',
							},
							{
								displayName: 'Phone Number',
								name: 'phoneNumberValue',
								type: 'string',
								displayOptions: {
									show: {
										type: [
											'phone_number',
										],
									},
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
										],
									},
								},
								default: '',
								description: `Phone number. No structure is enforced.`,
							},
							{
								displayName: 'Option',
								name: 'multiSelectValue',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getPropertySelectValues',
								},
								displayOptions: {
									show: {
										type: [
											'multi_select',
										],
									},
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
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
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
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
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
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
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
										],
									},
								},
								default: '',
								description: 'Web address.',
							},
							{
								displayName: 'User ID',
								name: 'peopleValue',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getUsers',
								},
								displayOptions: {
									show: {
										type: [
											'people',
										],
									},
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
										],
									},
								},
								default: '',
								description: 'List of users. Multiples can be defined separated by comma.',
							},
							{
								displayName: 'User ID',
								name: 'createdByValue',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getUsers',
								},
								displayOptions: {
									show: {
										type: [
											'created_by',
										],
									},
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
										],
									},
								},
								default: '',
								description: 'List of users. Multiples can be defined separated by comma.',
							},
							{
								displayName: 'User ID',
								name: 'lastEditedByValue',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getUsers',
								},
								displayOptions: {
									show: {
										type: [
											'last_edited_by',
										],
									},
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
										],
									},
								},
								default: '',
								description: 'List of users. Multiples can be defined separated by comma.',
							},
							{
								displayName: 'Relation ID',
								name: 'relationValue',
								type: 'string',
								displayOptions: {
									show: {
										type: [
											'relation',
										],
									},
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
										],
									},
								},
								default: '',
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
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
										],
									},
								},
								type: 'number',
								default: 0,
								description: 'Number value.',
							},
							{
								displayName: 'Date',
								name: 'date',
								displayOptions: {
									show: {
										type: [
											'date',
										],
									},
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
											'past_week',
											'past_month',
											'past_year',
											'next_week',
											'next_month',
											'next_year',
										],
									},
								},
								type: 'dateTime',
								default: '',
								description: 'An ISO 8601 format date, with optional time.',
							},
							{
								displayName: 'Created Time',
								name: 'createdTimeValue',
								displayOptions: {
									show: {
										type: [
											'created_time',
										],
									},
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
											'past_week',
											'past_month',
											'past_year',
											'next_week',
											'next_month',
											'next_year',
										],
									},
								},
								type: 'dateTime',
								default: '',
								description: 'An ISO 8601 format date, with optional time.',
							},
							{
								displayName: 'Last Edited Time',
								name: 'lastEditedTime',
								displayOptions: {
									show: {
										type: [
											'last_edited_time',
										],
									},
									hide: {
										condition: [
											'is_empty',
											'is_not_empty',
											'past_week',
											'past_month',
											'past_year',
											'next_week',
											'next_month',
											'next_year',
										],
									},
								},
								type: 'dateTime',
								default: '',
								description: 'An ISO 8601 format date, with optional time.',
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
										name: 'descending',
										value: 'descending',
									},
								],
								default: 'database',
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
								default: '',
								description: `The name of the timestamp to sort against.`,
							},
						],
					},
				],
			},
		],
	},
] as INodeProperties[];
