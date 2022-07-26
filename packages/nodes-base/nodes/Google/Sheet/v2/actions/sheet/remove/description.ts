import {
	SheetProperties,
} from '../../interfaces';

export const sheetRemoveDescription: SheetProperties = [
	{
		displayName: 'Sheet ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
				operation: [
					'remove',
				],
			},
		},
		description: 'The ID of the sheet to delete',
	},
];
