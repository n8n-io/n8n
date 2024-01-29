import type { RowProperties } from '../../Interfaces';

export const rowCreateDescription: RowProperties = [
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'options',
		placeholder: 'Select a table',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTableNames',
		},
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create'],
			},
		},
		default: '',
		description:
			'The name of SeaTable table to access. Choose from the list, or specify a name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Data to Send',
		name: 'fieldsToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
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
				resource: ['row'],
				operation: ['create'],
			},
		},
		default: 'defineBelow',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		displayName: 'Inputs to Ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create'],
				fieldsToSend: ['autoMapInputData'],
			},
		},
		default: '',
		description:
			'List of input properties to avoid sending, separated by commas. Leave empty to send all properties.',
		placeholder: 'Enter properties...',
	},
	{
		displayName: 'Columns to Send',
		name: 'columnsUi',
		placeholder: 'Add Column',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Column to Send',
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Column',
				name: 'columnValues',
				values: [
					{
						displayName: 'Column Name',
						name: 'columnName',
						type: 'options',
						description:
							'Choose from the list, or specify the column name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['tableName'],
							loadOptionsMethod: 'getTableUpdateAbleColumns',
						},
						default: '',
					},
					{
						displayName: 'Column Value',
						name: 'columnValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create'],
				fieldsToSend: ['defineBelow'],
			},
		},
		default: {},
		description:
			'Add destination column with its value. Provide the value in this way:<br>Date: YYYY-MM-DD or YYYY-MM-DD hh:mm<br>Duration: time in seconds<br>Checkbox: true, on or 1<br>Multi-Select: comma separated list',
	},
	{
		displayName: 'Save to "Big Data" backend',
		name: 'bigdata',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create'],
			},
		},
		default: false,
		description: 'This requires the activation of the Big Data backend in the base.',
	},
	{
		displayName: 'Hint: Link, files, images or digital signatures have to be added separately.',
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create'],
			},
		},
	},
];
