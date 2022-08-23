import {
	SheetProperties,
} from '../../interfaces';

export const sheetReadAllRowsDescription: SheetProperties = [

	// Optional
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
					'readAllRows',
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
							'readAllRows',
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
							'readAllRows',
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
							'readAllRows',
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
							'readAllRows',
						],
					},
				},
				default: 0,
				description: 'Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
			},
		],
	},
	{
		displayName: 'Output Format',
		name: 'outputFormat',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				'/resource': [
					'sheet',
				],
				'/operation': [
					'readAllRows',
				],
			},
		},
		options: [
			{
				displayName: 'Output Granularity',
				name: 'outputGranularity',
				type: 'options',
				displayOptions: {
					show: {
						'/resource': [
							'sheet',
						],
						'/operation': [
							'readAllRows',
						],
					},
				},
				options: [
					{
						'name': 'Single Item',
						'value': 'singleItem',
						'description': 'Output as a single item',
					},
					{
						'name': 'Split into Items',
						'value': 'splitIntoItems',
						'description': 'Split the output into multiple items',
					},
				],
				default: 'splitIntoItems',
			},
			{
				displayName: 'Read Rows Until',
				name: 'readRowsUntil',
				type: 'options',
				default: 'firstEmptyRow',
				displayOptions: {
					show: {
						'/operation': [
							'readAllRows',
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
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'By default, the workflow stops executing if the lookup/read does not return values',
			},
			{
				displayName: 'Output Formatting',
				name: 'outputFormatting',
				type: 'options',
				displayOptions: {
					show: {
						'/operation': [
							'readAllRows',
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
