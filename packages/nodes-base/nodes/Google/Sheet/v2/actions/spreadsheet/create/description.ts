import {
	SpreadSheetProperties,
} from '../../interfaces';

export const spreadsheetCreateDescription: SpreadSheetProperties = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'spreadsheet',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The title of the spreadsheet',
	},
	{
		displayName: 'Sheets',
		name: 'sheetsUi',
		placeholder: 'Add Sheet',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: [
					'spreadsheet',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				name: 'sheetValues',
				displayName: 'Sheet',
				values: [
					{
						displayName: 'Sheet Properties',
						name: 'propertiesUi',
						placeholder: 'Add Property',
						type: 'collection',
						default: {},
						options: [
							{
								displayName: 'Hidden',
								name: 'hidden',
								type: 'boolean',
								default: false,
								description: 'Whether the Sheet should be hidden in the UI',
							},
							{
								displayName: 'Title',
								name: 'title',
								type: 'string',
								default: '',
								description: 'Title of the property to create',
							},
						],
					},
				],
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
					'spreadsheet',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Locale',
				name: 'locale',
				type: 'string',
				default: '',
				placeholder: 'en_US',
				description: `The locale of the spreadsheet in one of the following formats:
				<ul>
					<li>en (639-1)</li>
					<li>fil (639-2 if no 639-1 format exists)</li>
					<li>en_US (combination of ISO language an country)</li>
				<ul>`,
			},
			{
				displayName: 'Recalculation Interval',
				name: 'autoRecalc',
				type: 'options',
				options: [
					{
						name: 'Default',
						value: '',
						description: 'Default value',
					},
					{
						name: 'On Change',
						value: 'ON_CHANGE',
						description: 'Volatile functions are updated on every change',
					},
					{
						name: 'Minute',
						value: 'MINUTE',
						description: 'Volatile functions are updated on every change and every minute',
					},
					{
						name: 'Hour',
						value: 'HOUR',
						description: 'Volatile functions are updated on every change and hourly',
					},
				],
				default: '',
				description: 'Cell recalculation interval options',
			},
		],
	},
];
