import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { GoogleSheet } from '../../helpers/GoogleSheet';
import {
	getRangeString,
	prepareSheetData,
	untilSheetSelected,
} from '../../helpers/GoogleSheets.utils';
import { SheetProperties } from '../../helpers/GoogleSheets.types';
import { dataLocationOnSheet, outputFormatting } from './commonDescription';
import {
	ILookupValues,
	RangeDetectionOptions,
	SheetRangeData,
	ValueRenderOption,
} from '../../helpers/GoogleSheets.types';

export const description: SheetProperties = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Column To Match On',
		name: 'columnToMatchOn',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['sheetName.value'],
			loadOptionsMethod: 'getSheetHeaderRow',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['readMatchingRows'],
			},
			hide: {
				...untilSheetSelected,
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
		placeholder: '',
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['readMatchingRows'],
			},
			hide: {
				...untilSheetSelected,
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
				...untilSheetSelected,
			},
		},
		options: [
			...dataLocationOnSheet,
			...outputFormatting,
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
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	let returnData: IDataObject[] = [];
	const items = this.getInputData();

	for (let i = 0; i < items.length; i++) {
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const outputFormatting =
			(((options.outputFormatting as IDataObject) || {}).values as IDataObject) || {};

		const dataLocationOnSheetOptions =
			(((options.dataLocationOnSheet as IDataObject) || {}).values as RangeDetectionOptions) || {};

		if (dataLocationOnSheetOptions.rangeDefinition === undefined) {
			dataLocationOnSheetOptions.rangeDefinition = 'detectAutomatically';
		}

		const range = getRangeString(sheetName, dataLocationOnSheetOptions);

		const valueRenderMode = (outputFormatting.general || 'UNFORMATTED_VALUE') as ValueRenderOption;
		const dateTimeRenderOption = (outputFormatting.date || 'FORMATTED_STRING') as string;

		const sheetData = (await sheet.getData(
			range,
			valueRenderMode,
			dateTimeRenderOption,
		)) as SheetRangeData;

		const { data, headerRow, firstDataRow } = prepareSheetData(
			sheetData,
			dataLocationOnSheetOptions,
		);

		if (!data.length) {
			return [];
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
			data as string[][],
			headerRow,
			firstDataRow,
			lookupValues,
			returnAllMatches,
		);

		if (responseData.length === 0 && returnAllMatches) {
			responseData = [];
		} else if (
			responseData.length === 1 &&
			Object.keys(responseData[0]).length === 0 &&
			!returnAllMatches
		) {
			responseData = [];
		}

		returnData = returnData.concat(responseData);
	}

	return this.helpers.returnJsonArray(returnData);
}
