import {
	SheetProperties,
} from '../../interfaces';

export const sheetLookupDescription: SheetProperties = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Column To Match On',
		name: 'columnToMatchOn',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: [
				'sheetName',
			],
			loadOptionsMethod: 'getSheetHeaderRow',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
				operation: [
					'lookup',
				],
			},
		},
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
	},
	{
		displayName: 'Value To Match',
		name: 'valueToMatch',
		type: 'string',
		default: '',
		placeholder: 'anna@n8n.io',
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
				operation: [
					'lookup',
				],
			},
		},
		description: 'The value to look for in column',
	},
	{
		displayName: 'Data Location on Sheet',
		name: 'dataLocationOnSheet',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
				operation: [
					'lookup',
				],
			},
		},
		options: [
			{
				displayName: 'Range Definition',
				name: 'rangeDefinition',
				type: 'options',
				displayOptions: {
					show: {
						'/resource': [
							'sheet',
						],
						'/operation': [
							'lookup',
						],
					},
				},
				options: [
					{
						'name': 'Detect Automatically',
						'value': 'detectAutomatically',
						'description': 'Automatically detect the data range',
					},
					{
						'name': 'Specify Range',
						'value': 'specifyRange',
						'description': 'Manually specify the data range',
					},
				],
				default: 'detectAutomatically',
			},
			{
				displayName: 'Range',
				name: 'range',
				type: 'string',
				displayOptions: {
					show: {
						'/resource': [
							'sheet',
						],
						'/operation': [
							'lookup',
						],
						/*'/dataLocationOnSheet.rangeDefinition': [
							'specifyRange',
						],*/
					},
				},
				default: 'A:F',
				description: 'The table range to read from or to append data to. See the Google <a href="https://developers.google.com/sheets/api/guides/values#writing">documentation</a> for the details.',
			},
			{
				displayName: 'First Data Row',
				name: 'firstDataRow',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				displayOptions: {
					show: {
						'/resource': [
							'sheet',
						],
						'/operation': [
							'lookup',
						],
					},
				},
				description: 'Index of the first row which contains the actual data and not the keys. Starts with 0.',
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
						'/resource': [
							'sheet',
						],
						'/operation': [
							'lookup',
						],
					},
				},
				default: 0,
				description: 'Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
			},
		],
	},
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
					'lookup',
				],
			},
		},
		options: [
			{
				displayName: 'Read Rows Until',
				name: 'readRowsUntil',
				type: 'options',
				default: 'firstEmptyRow',
				displayOptions: {
					show: {
						'/operation': [
							'lookup',
						],
					},
				},
				options: [
					{
						name: 'First Empty Row',
						value: 'firstEmptyRow',
						description: 'Read until the first empty row',
					},
					{
						name: 'Last Row In Sheet',
						value: 'lastRowInSheet',
						description: 'Read until the last row in the sheet',
					},
				],
				description: 'By default, the workflow stops executing if the lookup/read does not return values',
			},
			{
				displayName: 'When Multiple Matches',
				name: 'whenMultipleMatches',
				type: 'options',
				default: 'returnFirstMatch',
				options: [
					{
						name: 'Return First Match',
						value: 'returnFirstMatch',
						description: 'Return only the first match',
					},
					{
						name: 'Return All Matches',
						value: 'returnAllMatches',
						description: 'Return all values that match',
					},
				],
				displayOptions: {
					show: {
						'/operation': [
							'lookup',
						],
					},
				},
				description: 'By default only the first result gets returned, Set to "Return All Matches" to get multiple matches',
			},
			{
				displayName: 'Output Formatting',
				name: 'outputFormatting',
				type: 'options',
				displayOptions: {
					show: {
						'/operation': [
							'lookup',
						],
					},
				},
				options: [
					{
						name: 'Values (Formatted)',
						value: 'FORMATTED_VALUE',
						description: 'Values will be calculated & formatted in the reply according to the cell\'s formatting.Formatting is based on the spreadsheet\'s locale, not the requesting user\'s locale.For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return "$1.23"',
					},
					{
						name: 'Formula',
						value: 'FORMULA',
						description: 'Values will not be calculated. The reply will include the formulas. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return "=A1".',
					},
					{
						name: 'Values (Unformatted)',
						value: 'UNFORMATTED_VALUE',
						description: 'A currency cell with $1.23 would be formatted as the text "$1.23"',
					},
				],
				default: 'UNFORMATTED_VALUE',
				description: 'Determines how values should be rendered in the output',
			},
		],
	},
];
