import { INodeProperties } from 'n8n-workflow';

export const dataLocationOnSheet: INodeProperties[] = [
	{
		displayName: 'Data Location on Sheet',
		name: 'dataLocationOnSheet',
		type: 'fixedCollection',
		placeholder: 'Select Range',
		default: { values: { rangeDefinition: 'detectAutomatically' } },
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Range Definition',
						name: 'rangeDefinition',
						type: 'options',
						options: [
							{
								name: 'Detect Automatically',
								value: 'detectAutomatically',
								description: 'Automatically detect the data range',
							},
							{
								name: 'Specify Range',
								value: 'specifyRange',
								description: 'Manually specify the data range',
							},
						],
						default: '',
					},
					{
						displayName: 'Read Rows Until',
						name: 'readRowsUntil',
						type: 'options',
						default: 'lastRowInSheet',
						options: [
							{
								name: 'First Empty Row',
								value: 'firstEmptyRow',
							},
							{
								name: 'Last Row In Sheet',
								value: 'lastRowInSheet',
							},
						],
						description:
							'By default, the workflow stops executing if the lookup/read does not return values',
						displayOptions: {
							show: {
								rangeDefinition: ['detectAutomatically'],
							},
						},
					},
					{
						displayName: 'Header Row',
						name: 'headerRow',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 1,
						description:
							'Index of the row which contains the keys. Starts at 1. The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
						displayOptions: {
							show: {
								rangeDefinition: ['specifyRange'],
							},
						},
					},
					{
						displayName: 'First Data Row',
						name: 'firstDataRow',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 2,
						description:
							'Index of the first row which contains the actual data and not the keys. Starts with 1.',
						hint: 'First row is row 1',
						displayOptions: {
							show: {
								rangeDefinition: ['specifyRange'],
							},
						},
					},
					{
						displayName: 'Range',
						name: 'range',
						type: 'string',
						default: '',
						placeholder: 'A:Z',
						description:
							'The table range to read from or to append data to. See the Google <a href="https://developers.google.com/sheets/api/guides/values#writing">documentation</a> for the details.',
						hint: 'You can specify both the rows and the columns, e.g. C4:E7',
						displayOptions: {
							show: {
								rangeDefinition: ['specifyRange'],
							},
						},
					},
				],
			},
		],
	},
];

export const locationDefine: INodeProperties[] = [
	{
		displayName: 'Data Location on Sheet',
		name: 'locationDefine',
		type: 'fixedCollection',
		placeholder: 'Select Range',
		default: { values: {} },
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Header Row',
						name: 'headerRow',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 1,
						description:
							'Index of the row which contains the keys. Starts at 1. The incoming node data is matched to the keys for assignment. The matching is case sensitive.',
					},
					{
						displayName: 'First Data Row',
						name: 'firstDataRow',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 2,
						description:
							'Index of the first row which contains the actual data and not the keys. Starts with 1.',
						hint: 'First row is row 1',
					},
					{
						displayName: 'Range',
						name: 'range',
						type: 'string',
						default: '',
						placeholder: 'A:Z',
						description:
							'The table range to read from or to append data to. See the Google <a href="https://developers.google.com/sheets/api/guides/values#writing">documentation</a> for the details.',
						hint: 'You can specify both the rows and the columns, e.g. C4:E7',
					},
				],
			},
		],
	},
];

export const outputFormatting: INodeProperties[] = [
	{
		displayName: 'Output Formatting',
		name: 'outputFormatting',
		type: 'options',
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'Values (unformatted)',
				value: 'UNFORMATTED_VALUE',
				description:
					'Numbers stay as numbers, but any currency signs or special formatting is lost',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'Values (formatted)',
				value: 'FORMATTED_VALUE',
				description:
					'Numbers are turned to text, and displayed as in Google Sheets (e.g. with commas or currency signs)',
			},
			{
				name: 'Formulas',
				value: 'FORMULA',
			},
		],
		default: 'UNFORMATTED_VALUE',
		description: 'Determines how values should be rendered in the output',
	},
];

export const outputDateFormatting: INodeProperties[] = [
	{
		displayName: 'Output Date Formatting',
		name: 'dateTimeRenderOption',
		type: 'options',
		default: 'FORMATTED_STRING',
		options: [
			{
				name: 'Formatted Text',
				value: 'FORMATTED_STRING',
				description: "As displayed in Google Sheets, e.g. '01/01/2022'",
			},
			{
				name: 'Serial Number',
				value: 'SERIAL_NUMBER',
				description: 'A number representing the days since Dec 30, 1899',
			},
			// {
			// 	name: 'ISO Date String',
			// 	value: 'isoDateString',
			// 	// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-final-period
			// 	description: "E.g. '2022-01-01'",
			// },
		],
	},
];
