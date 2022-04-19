
import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getFilters,
} from './GenericFunctions';

export const rowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'row',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new row',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a row',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a row',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all rows',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a row',
			},
		],
		default: 'create',
	},
];

export const rowFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                row:create                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table Name',
		name: 'tableId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTables',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'create',
					'delete',
					'get',
					'getAll',
					'update',
				],
			},
		},
		default: '',
	},
	...getFilters(
		['row'],
		['update'],
		{
			includeNoneOption: false,
			filterTypeDisplayName: 'Select Type',
			filterStringDisplayName: 'Select Condition (String)',
			filterFixedCollectionDisplayName: 'Select Conditions',
			mustMatchOptions: [
				{
					name: 'Any Select Condition',
					value: 'anyFilter',
				},
				{
					name: 'All Select Conditions',
					value: 'allFilters',
				},
			],
		}),
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-map Input Data to Columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Define Below for Each Column',
				value: 'defineBelow',
				description: 'Set the value for each destination column',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'create',
					'update',
				],
			},
		},
		default: 'defineBelow',
		description: '',
	},
	{
		displayName: 'Inputs to Ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'create',
					'update',
				],
				dataToSend: [
					'autoMapInputData',
				],
			},
		},
		default: '',
		required: false,
		description: 'List of input properties to avoid sending, separated by commas. Leave empty to send all properties.',
		placeholder: 'Enter properties...',
	},
	{
		displayName: 'Fields to Send',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Field to Send',
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'create',
					'update',
				],
				dataToSend: [
					'defineBelow',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'fieldValues',
				values: [
					{
						displayName: 'Field Name',
						name: 'fieldId',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: [
								'tableId',
							],
							loadOptionsMethod: 'getTableColumns',
						},
						default: '',
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                row:delete                                  */
	/* -------------------------------------------------------------------------- */
	...getFilters(
		['row'],
		['delete'],
		{
			includeNoneOption: false,
			filterTypeDisplayName: 'Select Type',
			filterStringDisplayName: 'Select Condition (String)',
			filterFixedCollectionDisplayName: 'Select Conditions',
			mustMatchOptions: [
				{
					name: 'Any Select Condition',
					value: 'anyFilter',
				},
				{
					name: 'All Select Conditions',
					value: 'allFilters',
				},
		]}),
	/* -------------------------------------------------------------------------- */
	/*                                row:get                                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Select Conditions',
		name: 'filters',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		placeholder: 'Add Condition',
		options: [
			{
				displayName: 'Conditions',
				name: 'conditions',
				values: [
					{
						displayName: 'Name',
						name: 'keyName',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: [
								'tableId',
							],
							loadOptionsMethod: 'getTableColumns',
						},
						default: '',
						description: '',
					},
					{
						displayName: 'Value',
						name: 'keyValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                  row:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'row',
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
		},
		default: 50,
		description: 'How many results to return',
	},
	...getFilters(['row'], ['getAll'], {}),
];
