import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { GoogleSheet } from '../../helpers/GoogleSheet';
import {
	getRangeString,
	prepareSheetData,
	untilSheetSelected,
} from '../../helpers/GoogleSheets.utils';
import { dataLocationOnSheet, outputFormatting } from './commonDescription';
import {
	ILookupValues,
	RangeDetectionOptions,
	SheetProperties,
	SheetRangeData,
	ValueRenderOption,
} from '../../helpers/GoogleSheets.types';

export const description: SheetProperties = [
	{
		displayName: 'Filters',
		name: 'filtersUI',
		placeholder: 'Add Filter',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Filter',
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Filter',
				name: 'values',
				values: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
						displayName: 'Column',
						name: 'lookupColumn',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: ['sheetName.value'],
							loadOptionsMethod: 'getSheetHeaderRowWithGeneratedColumnNames',
						},
						default: '',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
					},
					{
						displayName: 'Value',
						name: 'lookupValue',
						type: 'string',
						default: '',
						hint: 'The column must have this value to be matched',
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['read'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
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
				operation: ['read'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
		options: [
			...dataLocationOnSheet,
			...outputFormatting,
			{
				displayName: 'When Filter Has Multiple Matches',
				name: 'returnAllMatches',
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
	const options = this.getNodeParameter('options', 0, {});
	const outputFormattingOption =
		((options.outputFormatting as IDataObject)?.values as IDataObject) || {};

	const dataLocationOnSheetOptions =
		((options.dataLocationOnSheet as IDataObject)?.values as RangeDetectionOptions) || {};

	if (dataLocationOnSheetOptions.rangeDefinition === undefined) {
		dataLocationOnSheetOptions.rangeDefinition = 'detectAutomatically';
	}

	const range = getRangeString(sheetName, dataLocationOnSheetOptions);

	const valueRenderMode = (outputFormattingOption.general ??
		'UNFORMATTED_VALUE') as ValueRenderOption;
	const dateTimeRenderOption = (outputFormattingOption.date ?? 'FORMATTED_STRING') as string;

	const sheetData = (await sheet.getData(
		range,
		valueRenderMode,
		dateTimeRenderOption,
	)) as SheetRangeData;

	if (sheetData === undefined || sheetData.length === 0) {
		return [];
	}

	const { data, headerRow, firstDataRow } = prepareSheetData(sheetData, dataLocationOnSheetOptions);

	let returnData = [];

	const lookupValues = this.getNodeParameter('filtersUI.values', 0, []) as ILookupValues[];

	if (lookupValues.length) {
		const returnAllMatches = options.returnAllMatches === 'returnAllMatches' ? true : false;

		const items = this.getInputData();
		for (let i = 1; i < items.length; i++) {
			const itemLookupValues = this.getNodeParameter('filtersUI.values', i, []) as ILookupValues[];
			if (itemLookupValues.length) {
				lookupValues.push(...itemLookupValues);
			}
		}

		returnData = await sheet.lookupValues(
			data as string[][],
			headerRow,
			firstDataRow,
			lookupValues,
			returnAllMatches,
		);
	} else {
		returnData = sheet.structureArrayDataByColumn(data as string[][], headerRow, firstDataRow);
	}

	return this.helpers.returnJsonArray(returnData);
}
