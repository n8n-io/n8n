import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { SheetProperties } from '../../helpers/GoogleSheets.types';
import type { GoogleSheet } from '../../helpers/GoogleSheet';
import { getColumnNumber, untilSheetSelected } from '../../helpers/GoogleSheets.utils';
import { generatePairedItemData, wrapData } from '../../../../../../utils/utilities';

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
		displayName: 'Delete Empty Rows',
		name: 'deleteEmptyRows',
		type: 'boolean',
		default: false,
		description: 'Delete all empty rows',
		displayOptions: {
			show: {
				toDelete: ['rows']
			}
		}
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
				deleteEmptyRows: [true],
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
				deleteEmptyRows: [true],
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
	sheetId: string 	//router always gives us both name and id
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();

	for (let i = 0; i < items.length; i++) {
		const requests: IDataObject[] = [];
		let startIndex, endIndex, numberToDelete;
		const deleteType = this.getNodeParameter('toDelete', i) as string;

		if (deleteType === 'rows') {
			const deleteEmptyRows = this.getNodeParameter('deleteEmptyRows', i) as boolean;

			if (deleteEmptyRows){
				const range = sheetName; //full sheet
				const response =  (await sheet.getData(range, 'UNFORMATTED_VALUE', 'FORMATTED_STRING'));
				const rows = response || [];
				const emptyRows: number[] = [];
			
				// Identify empty rows
				rows.forEach((row, index) => {
					if (!row.length)
						emptyRows.push(index + 1); // Store the row number (1-indexed)
				});
				
				// Delete empty rows (from bottom to top to avoid indices moving)
				for(let rowIndex of emptyRows.reverse()){
					requests.push({
						deleteDimension: {
							range: {
								sheetId: sheetId,
								dimension: 'ROWS',
								startIndex: rowIndex-1,
								endIndex: rowIndex,
							}
						}
					})
				};	
			}
			else{
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
							sheetId: sheetId,
							dimension: 'ROWS',
							startIndex,
							endIndex,
						},
					},
				});
			}
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
						sheetId: sheetId,
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
