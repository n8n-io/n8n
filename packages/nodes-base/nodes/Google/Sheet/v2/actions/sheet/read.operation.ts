import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { dataLocationOnSheet, outputFormatting } from './commonDescription';
import type { GoogleSheet } from '../../helpers/GoogleSheet';
import type { SheetProperties } from '../../helpers/GoogleSheets.types';
import { untilSheetSelected } from '../../helpers/GoogleSheets.utils';
import { readSheet } from '../utils/readOperation';

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

export const readFilter: INodeProperties = {
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
};

export const description: SheetProperties = [
	{
		...readFilter,
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

	let returnData: INodeExecutionData[] = [];

	for (let itemIndex = 0; itemIndex < length; itemIndex++) {
		returnData = await readSheet.call(
			this,
			sheet,
			sheetName,
			itemIndex,
			returnData,
			nodeVersion,
			items,
		);
	}

	return returnData;
}
