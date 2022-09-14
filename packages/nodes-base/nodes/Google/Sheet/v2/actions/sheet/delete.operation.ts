import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { SheetProperties } from '../../helper/GoogleSheets.types';
import { GoogleSheet } from '../../helper/GoogleSheet';
import { getColumnNumber, untilSheetSelected } from '../../helper/GoogleSheets.utils';

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
		default: 1,
		description: 'The row number to delete from, The first row is 1',
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
		// ###
		// Data Location
		//###
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
		// Do we want to support multiple?
		// const toDelete = this.getNodeParameter('toDelete', 0) as IToDelete;

		// const deletePropertyToDimensions: IDataObject = {
		// 	columns: 'COLUMNS',
		// 	rows: 'ROWS',
		// };

		// for (const propertyName of Object.keys(deletePropertyToDimensions)) {
		// 	if (toDelete[propertyName] !== undefined) {
		// 		toDelete[propertyName]!.forEach((range) => {
		// 			requests.push({
		// 				deleteDimension: {
		// 					range: {
		// 						sheetId: range.sheetId,
		// 						dimension: deletePropertyToDimensions[propertyName] as string,
		// 						startIndex: range.startIndex,
		// 						endIndex:
		// 							parseInt(range.startIndex.toString(), 10) + parseInt(range.amount.toString(), 10),
		// 					},
		// 				},
		// 			});
		// 		});
		// 	}
		// }
		const data = await sheet.spreadsheetBatchUpdate(requests);
	}

	return items;
}
