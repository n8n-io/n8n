import {
	SheetProperties,
} from '../../interfaces';

export const sheetUpdateDescription: SheetProperties = [
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
				operation: [
					'update',
				],
			},
		},
		default: 'A:F',
		required: true,
		description: 'The table range to read from or to append data to. See the Google <a href="https://developers.google.com/sheets/api/guides/values#writing">documentation</a> for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"',
	},
	{
		displayName: 'RAW Data',
		name: 'rawData',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
				operation: [
					'update',
				],
			},
		},
		default: false,
		description: 'Whether the data should be returned RAW instead of parsed into keys according to their header',
	},
	{
		displayName: 'Data Property',
		name: 'dataProperty',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
				operation: [
					'update',
				],
				rawData: [
					true,
				],
			},
		},
		description: 'The name of the property into which to write the RAW data',
	},
	{
		displayName: 'Data Start Row',
		name: 'dataStartRow',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 1,
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
				operation: [
					'update',
				],
			},
			hide: {
				rawData: [
					true,
				],
			},
		},
		description: 'Index of the first row which contains the actual data and not the keys. Starts with 0.',
	},
	{
		displayName: 'Key Row',
		name: 'keyRow',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
				operation: [
					'update',
				],
			},
			hide: {
				rawData: [
					true,
				],
			},
		},
		default: 1,
		description: 'Index of the row which contains the keys. Starts at 1. The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
	},
	{
		displayName: 'Key',
		name: 'key',
		type: 'string',
		default: 'id',
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
				operation: [
					'update',
				],
				rawData: [
					false,
				],
			},
		},
		description: 'The name of the key to identify which data should be updated in the sheet',
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
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Value Input Mode',
				name: 'valueInputMode',
				type: 'options',
				displayOptions: {
					show: {
						'/operation': [
							'update',
						],
					},
				},
				options: [
					{
						name: 'RAW',
						value: 'RAW',
						description: 'The values will not be parsed and will be stored as-is',
					},
					{
						name: 'User Entered',
						value: 'USER_ENTERED',
						description: 'The values will be parsed as if the user typed them into the UI. Numbers will stay as numbers, but strings may be converted to numbers, dates, etc. following the same rules that are applied when entering text into a cell via the Google Sheets UI.',
					},
				],
				default: 'RAW',
				description: 'Determines how data should be interpreted',
			},
			{
				displayName: 'Value Render Mode',
				name: 'valueRenderMode',
				type: 'options',
				displayOptions: {
					show: {
						'/operation': [
							'update',
						],
						'/rawData': [
							false,
						],
					},
				},
				options: [
					{
						name: 'Formatted Value',
						value: 'FORMATTED_VALUE',
						description: 'Values will be calculated & formatted in the reply according to the cell\'s formatting.Formatting is based on the spreadsheet\'s locale, not the requesting user\'s locale. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return "$1.23".',
					},
					{
						name: 'Formula',
						value: 'FORMULA',
						description: 'Values will not be calculated. The reply will include the formulas. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return "=A1".',
					},
					{
						name: 'Unformatted Value',
						value: 'UNFORMATTED_VALUE',
						description: 'Values will be calculated, but not formatted in the reply. For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return the number 1.23.',
					},
				],
				default: 'UNFORMATTED_VALUE',
				description: 'Determines how values should be rendered in the output',
			},
		],
	},
];
