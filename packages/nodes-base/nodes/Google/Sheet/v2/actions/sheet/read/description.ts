import {
	SheetProperties,
} from '../../interfaces';

export const sheetReadDescription: SheetProperties = [
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
					'read',
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
					'read',
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
					'read',
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
					'read',
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
			minValue: 0,
		},
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
				operation: [
					'read',
				],
			},
			hide: {
				rawData: [
					true,
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
					'read',
				],
			},
		},
		options: [
			{
				displayName: 'Continue If Empty',
				name: 'continue',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						'/operation': [
							'read',
						],
					},
				},
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'By default, the workflow stops executing if the lookup/read does not return values',
			},
			{
				displayName: 'Value Render Mode',
				name: 'valueRenderMode',
				type: 'options',
				displayOptions: {
					show: {
						'/operation': [
							'read',
						],
					},
				},
				options: [
					{
						name: 'Formatted Value',
						value: 'FORMATTED_VALUE',
						description: 'Values will be calculated & formatted in the reply according to the cell\'s formatting.Formatting is based on the spreadsheet\'s locale, not the requesting user\'s locale.For example, if A1 is 1.23 and A2 is =A1 and formatted as currency, then A2 would return "$1.23"',
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
