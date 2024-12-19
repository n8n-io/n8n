import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { dataLocationOnSheet, outputFormatting } from './commonDescription';
import type { GoogleSheet } from '../../helpers/GoogleSheet';
import type {
	ILookupValues,
	RangeDetectionOptions,
	SheetProperties,
	SheetRangeData,
	ValueRenderOption,
} from '../../helpers/GoogleSheets.types';
import {
	getRangeString,
	prepareSheetData,
	untilSheetSelected,
} from '../../helpers/GoogleSheets.utils';

const combineFiltersOptions: INodeProperties = {
	displayName: 'Combine Filters',
	name: 'combineFilters',
	type: 'options',
	description:
		'How to combine the conditions defined in "Filters": AND requires all conditions to be true, OR requires at least one condition to be true',
	options: [
		{
			name: 'AND',
			value: 'AND',
			description: 'Only rows that meet all the conditions are selected',
		},
		{
			name: 'OR',
			value: 'OR',
			description: 'Rows that meet at least one condition are selected',
		},
	],
	default: 'AND',
};

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
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
		...combineFiltersOptions,
		default: 'OR',
		displayOptions: {
			show: {
				'@version': [{ _cnd: { lt: 4.3 } }],
				resource: ['sheet'],
				operation: ['read'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
	},
	{
		...combineFiltersOptions,
		displayOptions: {
			show: {
				'@version': [{ _cnd: { gte: 4.3 } }],
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
		placeholder: 'Add option',
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
			dataLocationOnSheet,
			outputFormatting,
			{
				displayName: 'Return only First Matching Row',
				name: 'returnFirstMatch',
				type: 'boolean',
				default: false,
				description:
					'Whether to select the first row of the sheet or the first matching row (if filters are set)',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 4.5 } }],
					},
				},
			},
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
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lt: 4.5 } }],
					},
				},
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const nodeVersion = this.getNode().typeVersion;
	let length = 1;

	if (nodeVersion > 4.1) {
		length = items.length;
	}

	const returnData: INodeExecutionData[] = [];

	for (let itemIndex = 0; itemIndex < length; itemIndex++) {
		const options = this.getNodeParameter('options', itemIndex, {});
		const outputFormattingOption =
			((options.outputFormatting as IDataObject)?.values as IDataObject) || {};

		const dataLocationOnSheetOptions =
			((options.dataLocationOnSheet as IDataObject)?.values as RangeDetectionOptions) || {};

		if (dataLocationOnSheetOptions.rangeDefinition === undefined) {
			dataLocationOnSheetOptions.rangeDefinition = 'detectAutomatically';
		}

		const range = getRangeString(sheetName, dataLocationOnSheetOptions);

		const valueRenderMode = (outputFormattingOption.general ||
			'UNFORMATTED_VALUE') as ValueRenderOption;
		const dateTimeRenderOption = (outputFormattingOption.date || 'FORMATTED_STRING') as string;

		const sheetData = (await sheet.getData(
			range,
			valueRenderMode,
			dateTimeRenderOption,
		)) as SheetRangeData;

		if (sheetData === undefined || sheetData.length === 0) {
			return [];
		}

		const {
			data,
			headerRow: keyRowIndex,
			firstDataRow: dataStartRowIndex,
		} = prepareSheetData(sheetData, dataLocationOnSheetOptions);

		let responseData = [];

		const lookupValues = this.getNodeParameter(
			'filtersUI.values',
			itemIndex,
			[],
		) as ILookupValues[];

		const inputData = data as string[][];

		if (lookupValues.length) {
			let returnAllMatches;
			if (nodeVersion < 4.5) {
				returnAllMatches = options.returnAllMatches === 'returnAllMatches' ? true : false;
			} else {
				returnAllMatches = options.returnFirstMatch ? false : true;
			}

			if (nodeVersion <= 4.1) {
				for (let i = 1; i < items.length; i++) {
					const itemLookupValues = this.getNodeParameter(
						'filtersUI.values',
						i,
						[],
					) as ILookupValues[];
					if (itemLookupValues.length) {
						lookupValues.push(...itemLookupValues);
					}
				}
			}

			const combineFilters = this.getNodeParameter('combineFilters', itemIndex, 'OR') as
				| 'AND'
				| 'OR';

			responseData = await sheet.lookupValues({
				inputData,
				keyRowIndex,
				dataStartRowIndex,
				lookupValues,
				returnAllMatches,
				combineFilters,
			});
		} else {
			responseData = sheet.structureArrayDataByColumn(inputData, keyRowIndex, dataStartRowIndex);
		}

		returnData.push(
			...responseData.map((item) => {
				return {
					json: item,
					pairedItem: { item: itemIndex },
				};
			}),
		);
	}

	return returnData;
}
