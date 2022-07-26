import {
	SheetProperties,
} from '../../interfaces';

export const sheetClearDescription: SheetProperties = [
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
					'clear',
				],
			},
		},
		default: 'A:F',
		required: true,
		description: 'The table range to read from or to append data to. See the Google <a href="https://developers.google.com/sheets/api/guides/values#writing">documentation</a> for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"',
	},
];
