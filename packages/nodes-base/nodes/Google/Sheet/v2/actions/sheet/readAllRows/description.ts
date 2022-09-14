import { SheetProperties } from '../../../helper/GoogleSheets.types';
import { dataLocationOnSheet, outputDateFormatting, outputFormatting } from '../commonDescription';

export const sheetReadAllRowsDescription: SheetProperties = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['readAllRows'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		options: [...dataLocationOnSheet, ...outputDateFormatting, ...outputFormatting],
	},
];
