import {
	SheetProperties,
} from '../../interfaces';

export const sheetAppendDescription: SheetProperties = [
	// DB Data Mapping
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
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
			{
				name: 'Nothing',
				value: 'nothing',
				description: 'Do not send anything',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'append',
				],
			},
		},
		default: 'defineBelow',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		displayName: 'Handling Extra Data',
		name: 'handlingExtraData',
		type: 'options',
		options: [
			{
				name: 'Insert in New Column(s)',
				value: 'insertInNewColumn',
				description: 'Create a new column for extra data',
			},
			{
				name: 'Ignore It',
				value: 'ignoreIt',
				description: 'Ignore extra data',
			},
			{
				name: 'Error',
				value: 'error',
				description: 'Throw an error',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'append',
				],
				dataToSend: [
					'autoMapInputData',
				],
			},
		},
		default: 'insertInNewColumn',
		description: 'How to handle extra data',
	},
	/*{
		displayName: 'Inputs to Ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'append',
				],
				dataToSend: [
					'autoMapInputData',
				],
			},
		},
		default: '',
		description: 'List of input properties to avoid sending, separated by commas. Leave empty to send all properties.',
		placeholder: 'Enter properties...',
	},*/
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
				operation: [
					'append',
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
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: [
								'sheetName',
							],
							loadOptionsMethod: 'getSheetHeaderRow',
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
	// END DB DATA MAPPING
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
				operation: [
					'append',
				],
			},
		},
		options: [
			/*{
				displayName: 'Use Header Names as JSON Paths',
				name: 'usePathForKeyRow',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						'/operation': [
							'append',
						],
					},
				},
				description: 'Whether you want to match the headers as path, for example, the row header "category.name" will match the "category" object and get the field "name" from it. By default "category.name" will match with the field with exact name, not nested object.',
			},*/
			{
				displayName: 'Cell Format',
				name: 'cellFormat',
				type: 'options',
				displayOptions: {
					show: {
						'/operation': [
							'append',
						],
					},
				},
				options: [
					{
						name: 'Use Format From N8N',
						value: 'RAW',
						description: 'The values will not be parsed and will be stored as-is',
					},
					{
						name: 'Automatic',
						value: 'USER_ENTERED',
						description: 'The values will be parsed as if the user typed them into the UI. Numbers will stay as numbers, but strings may be converted to numbers, dates, etc. following the same rules that are applied when entering text into a cell via the Google Sheets UI.',
					},
				],
				default: 'RAW',
				description: 'Determines how data should be interpreted',
			},
			{
				displayName: 'Header Row',
				name: 'headerRow',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				displayOptions: {
					show: {
						'/operation': [
							'append',
						],
					},
				},
				default: 0,
				description: 'Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
			},
		],
	},
];
