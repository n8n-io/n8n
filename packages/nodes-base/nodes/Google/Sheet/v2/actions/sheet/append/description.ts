import {
	SheetProperties,
} from '../../interfaces';

export const sheetAppendDescription: SheetProperties = [
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
					'append',
				],
			},
		},
		default: 'A:F',
		required: true,
		description: 'The table range to read from or to append data to. See the Google <a href="https://developers.google.com/sheets/api/guides/values#writing">documentation</a> for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"',
	},
	{
		displayName: 'Key Row',
		name: 'keyRow',
		type: 'number',
		typeOptions: {
			minValue: 0,
		},
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
		default: 0,
		description: 'Index of the row which contains the keys. Starts at 0. The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
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
					'append',
				],
			},
		},
		options: [
			{
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
			},
			{
				displayName: 'Value Input Mode',
				name: 'valueInputMode',
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
		],
	},
];
