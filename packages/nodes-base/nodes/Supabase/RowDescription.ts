import type { INodeProperties } from 'n8n-workflow';

import { getFilters } from './GenericFunctions';

export const rowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['row'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new row',
				action: 'Create a row',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a row',
				action: 'Delete a row',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a row',
				action: 'Get a row',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many rows',
				action: 'Get many rows',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a row',
				action: 'Update a row',
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
		displayName: 'Table name or ID',
		name: 'tableId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsDependsOn: ['useCustomSchema', 'schema'],
			loadOptionsMethod: 'getTables',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create', 'delete', 'get', 'getAll', 'update'],
			},
		},
		default: '',
	},
	...getFilters(['row'], ['update'], {
		includeNoneOption: false,
		filterTypeDisplayName: 'Select Type',
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
		displayName: 'Data to send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-map input data to columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Define below for each column',
				value: 'defineBelow',
				description: 'Set the value for each destination column',
			},
		],
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create', 'update'],
			},
		},
		default: 'defineBelow',
	},
	{
		displayName: 'Inputs to ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create', 'update'],
				dataToSend: ['autoMapInputData'],
			},
		},
		default: '',
		description:
			'List of input properties to avoid sending, separated by commas. Leave empty to send all properties.',
		placeholder: 'Enter properties...',
	},
	{
		displayName: 'Fields to send',
		name: 'fieldsUi',
		placeholder: 'Add field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Field to Send',
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create', 'update'],
				dataToSend: ['defineBelow'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'fieldValues',
				values: [
					{
						displayName: 'Field name or ID',
						name: 'fieldId',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['tableId'],
							loadOptionsMethod: 'getTableColumns',
						},
						default: '',
					},
					{
						displayName: 'Field value',
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
	...getFilters(['row'], ['delete'], {
		includeNoneOption: false,
		filterTypeDisplayName: 'Select Type',
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
	/* -------------------------------------------------------------------------- */
	/*                                row:get                                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Select conditions',
		name: 'filters',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['get'],
			},
		},
		default: {},
		placeholder: 'Add condition',
		options: [
			{
				displayName: 'Conditions',
				name: 'conditions',
				values: [
					{
						displayName: 'Name or ID',
						name: 'keyName',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: ['tableId'],
							loadOptionsMethod: 'getTableColumns',
						},
						default: '',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['row'],
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
				resource: ['row'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	// Supabase REST API uses PostgREST under the hood. Without a stable ORDER BY, offset-based
	// pagination returns non-deterministic pages — the database may return the same row in both
	// page 1 and page 2, or skip rows entirely. Adding ?order=column ensures consistent page
	// boundaries and prevents duplicates when using Return All or Limit >= 1000.
	// See https://supabase.com/docs/guides/api/sql-to-rest for the order parameter syntax.
	{
		displayName: 'Order by',
		name: 'orderBy',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['getAll'],
			},
		},
		default: '',
		placeholder: 'e.g. ID or created_at.desc',
		description:
			'Column(s) to order results by, e.g. <code>ID</code> or <code>created_at.desc</code>. Recommended when using Return All or Limit ≥ 1000 to avoid duplicate or missing records.',
	},
	...getFilters(['row'], ['getAll'], {}),
];
