import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { GoogleSheet } from '../../helper/GoogleSheet';
import { ILookupValues, SheetRangeData, ValueRenderOption } from '../../helper/GoogleSheets.types';
import { addRowNumber, trimToFirstEmptyRow } from '../../helper/GoogleSheets.utils';
import { SheetProperties } from '../../helper/GoogleSheets.types';
import { dataLocationOnSheet, outputDateFormatting, outputFormatting } from './commonDescription';

export const description: SheetProperties = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Column To Match On',
		name: 'columnToMatchOn',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['sheetName'],
			loadOptionsMethod: 'getSheetHeaderRow',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['readMatchingRows'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
	},
	{
		displayName: 'Value To Match',
		name: 'valueToMatch',
		type: 'string',
		default: '',
		placeholder: 'anna@n8n.io',
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['readMatchingRows'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		description: 'The value to look for in column',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['readMatchingRows'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		options: [
			...dataLocationOnSheet,
			...outputFormatting,
			...outputDateFormatting,
			{
				displayName: 'When Multiple Matches',
				name: 'whenMultipleMatches',
				type: 'options',
				default: 'returnFirstMatch',
				options: [
					{
						name: 'Return First Match',
						value: 'returnFirstMatch',
						description: 'Return only the first match',
					},
					{
						name: 'Return All Matches',
						value: 'returnAllMatches',
						description: 'Return all values that match',
					},
				],
				description:
					'By default only the first result gets returned, Set to "Return All Matches" to get multiple matches',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	let returnData: IDataObject[] = [];
	const items = this.getInputData();

	for (let i = 0; i < items.length; i++) {
		const options = this.getNodeParameter('options', i, {}) as IDataObject;

		const dataLocationOnSheetOptions =
			(((options.dataLocationOnSheet as IDataObject) || {}).values as IDataObject) || {};

		let range = sheetName;
		if (dataLocationOnSheetOptions.rangeDefinition === 'specifyRange') {
			range = dataLocationOnSheetOptions.range
				? `${sheetName}!${dataLocationOnSheetOptions.range as string}`
				: `${sheetName}!A:F`;
		}

		const valueRenderMode = (options.outputFormatting || 'UNFORMATTED_VALUE') as ValueRenderOption;

		// Default is to stop if we hit an empty row
		let shouldContinue = false;
		if (options.readRowsUntil === 'lastRowInSheet') {
			shouldContinue = true;
		}

		let sheetData = (await sheet.getData(
			sheet.encodeRange(range),
			valueRenderMode,
			options.dateTimeRenderOption as string,
		)) as SheetRangeData;

		if (sheetData === undefined) {
			return [];
		}

		sheetData = addRowNumber(sheetData);

		if (
			dataLocationOnSheetOptions.readRowsUntil === 'firstEmptyRow' &&
			dataLocationOnSheetOptions.rangeDefinition === 'detectAutomatically'
		) {
			sheetData = trimToFirstEmptyRow(sheetData);
		}

		let headerRow = 0;
		let firstDataRow = 1;
		if (dataLocationOnSheetOptions.rangeDefinition === 'specifyRange') {
			headerRow = parseInt(dataLocationOnSheetOptions.headerRow as string, 10) - 1;
			firstDataRow = parseInt(dataLocationOnSheetOptions.firstDataRow as string, 10) - 1;
		}

		const lookupValues: ILookupValues[] = [];
		lookupValues.push({
			lookupColumn: this.getNodeParameter('columnToMatchOn', i) as string,
			lookupValue: this.getNodeParameter('valueToMatch', i) as string,
		});

		let returnAllMatches = false;
		if (options.whenMultipleMatches === 'returnAllMatches') {
			returnAllMatches = true;
		}

		let responseData = await sheet.lookupValues(
			sheetData as string[][],
			headerRow,
			firstDataRow,
			lookupValues,
			returnAllMatches,
		);

		if (responseData.length === 0 && shouldContinue && returnAllMatches) {
			responseData = [{}];
		} else if (
			responseData.length === 1 &&
			Object.keys(responseData[0]).length === 0 &&
			!shouldContinue &&
			!returnAllMatches
		) {
			responseData = [];
		}

		returnData = returnData.concat(responseData);
	}

	return this.helpers.returnJsonArray(returnData);
}
