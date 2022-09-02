import { SheetProperties } from '../../interfaces';

export const sheetUpdateDescription: SheetProperties = [
	// DB Data Mapping
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-Match',
				value: 'autoMatch',
				description: 'Attempt to automatically find the field',
			},
			{
				name: 'Define Below',
				value: 'defineBelow',
				description: 'Set the value for each destination column',
			},
		],
		displayOptions: {
			show: {
				operation: ['update'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		default: 'defineBelow',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	/*{
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
					'update',
				],
				dataToSend: [
					'autoMapInputData',
				],
			},
		},
		default: 'insertInNewColumn',
		description: 'How to handle extra data',
	},*/
	/*{
		displayName: 'Inputs to Ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
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
		displayName: 'Field to Match On',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				operation: ['update'],
				dataToSend: ['defineBelow'],
			},
			hide: {
				spreadsheetName: [''],
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
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['sheetName'],
							loadOptionsMethod: 'getSheetHeaderRow',
						},
						default: '',
					},
					{
						displayName: 'Value of Column to Match On',
						name: 'valueToMatchOn',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Select Column Name or ID',
		name: 'fieldsUi',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['update'],
				dataToSend: ['autoMatch'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		typeOptions: {
			loadOptionsDependsOn: ['sheetName'],
			loadOptionsMethod: 'getSheetHeaderRow',
		},
		default: {},
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
				resource: ['sheet'],
				operation: ['update'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		options: [
			{
				displayName: 'Cell Format',
				name: 'cellFormat',
				type: 'options',
				displayOptions: {
					show: {
						'/operation': ['update'],
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
						description:
							'The values will be parsed as if the user typed them into the UI. Numbers will stay as numbers, but strings may be converted to numbers, dates, etc. following the same rules that are applied when entering text into a cell via the Google Sheets UI.',
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
					minValue: 1,
				},
				displayOptions: {
					show: {
						'/operation': ['update'],
					},
				},
				default: 1,
				description:
					'Index of the row which contains the keys. Starts at 1. The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
			},
			{
				displayName: 'Data Start Row',
				name: 'dataStartRow',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						'/operation': ['update'],
					},
				},
				default: 2,
				description: 'Index of the row to start inserting from',
			},
		],
	},
];
