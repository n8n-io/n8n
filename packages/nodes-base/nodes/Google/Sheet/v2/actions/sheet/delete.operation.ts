import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';

import { generatePairedItemData, wrapData } from '../../../../../../utils/utilities';
import type { GoogleSheet } from '../../helpers/GoogleSheet';
import type { SheetProperties } from '../../helpers/GoogleSheets.types';
import { getColumnNumber, untilSheetSelected } from '../../helpers/GoogleSheets.utils';

export const description: SheetProperties = [
	{
		displayName: 'To Delete',
		name: 'toDelete',
		type: 'options',
		options: [
			{
				name: 'Rows',
				value: 'rows',
				description: 'Rows to delete',
			},
			{
				name: 'Columns',
				value: 'columns',
				description: 'Columns to delete',
			},
		],
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['delete'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		default: 'rows',
		description: 'What to delete',
	},
	{
		displayName: 'Start Row Number',
		name: 'startIndex',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 2,
		description: 'The row number to delete from, The first row is 2',
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['delete'],
				toDelete: ['rows'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
	},
	{
		displayName: 'Number of Rows to Delete',
		name: 'numberToDelete',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 1,
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['delete'],
				toDelete: ['rows'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
	},
	{
		displayName: 'Start Column',
		name: 'startIndex',
		type: 'string',
		default: 'A',
		description: 'The column to delete',
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['delete'],
				toDelete: ['columns'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
	},
	{
		displayName: 'Number of Columns to Delete',
		name: 'numberToDelete',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 1,
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['delete'],
				toDelete: ['columns'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();

	for (let i = 0; i < items.length; i++) {
		const requests: IDataObject[] = [];
		let startIndex, endIndex, numberToDelete;
		const deleteType = this.getNodeParameter('toDelete', i) as string;

		if (deleteType === 'rows') {
			startIndex = this.getNodeParameter('startIndex', i) as number;
			// We start from 1 now...
			startIndex--;
			numberToDelete = this.getNodeParameter('numberToDelete', i) as number;
			if (numberToDelete === 1) {
				endIndex = startIndex + 1;
			} else {
				endIndex = startIndex + numberToDelete;
			}
			requests.push({
				deleteDimension: {
					range: {
						sheetId: sheetName,
						dimension: 'ROWS',
						startIndex,
						endIndex,
					},
				},
			});
		} else if (deleteType === 'columns') {
			startIndex = this.getNodeParameter('startIndex', i) as string;
			numberToDelete = this.getNodeParameter('numberToDelete', i) as number;
			startIndex = getColumnNumber(startIndex) - 1;
			if (numberToDelete === 1) {
				endIndex = startIndex + 1;
			} else {
				endIndex = startIndex + numberToDelete;
			}
			requests.push({
				deleteDimension: {
					range: {
						sheetId: sheetName,
						dimension: 'COLUMNS',
						startIndex,
						endIndex,
					},
				},
			});
		}
		await sheet.spreadsheetBatchUpdate(requests);
	}

	const itemData = generatePairedItemData(this.getInputData().length);
	const returnData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
		itemData,
	});

	return returnData;
}
