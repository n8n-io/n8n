import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { dataLocationOnSheet, outputFormatting } from './commonDescription';
import type { GoogleSheet } from '../../helpers/GoogleSheet';
import type { SheetProperties } from '../../helpers/GoogleSheets.types';
import { getGridSheetNames, untilSheetSelected } from '../../helpers/GoogleSheets.utils';
import { readSheet } from '../utils/readOperation';

/** Column added to every row in "All Sheets" mode, naming the sheet it came from */
const SHEET_NAME_FIELD = '_sheetName';

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

const readOptions: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add option',
	default: {},
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
};

export const description: SheetProperties = [
	{
		...readFilter,
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['read'],
				sheetSelectionMode: ['single'],
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
				sheetSelectionMode: ['single'],
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
				sheetSelectionMode: ['single'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
	},
	{
		...readOptions,
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['read'],
				sheetSelectionMode: ['single'],
			},
			hide: {
				...untilSheetSelected,
			},
		},
	},
	{
		// "All Sheets" reads every sheet, so there is no sheet to wait for
		...readOptions,
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['read'],
				sheetSelectionMode: ['all'],
			},
		},
	},
];

/**
 * Reads every sheet of the spreadsheet in turn, tagging each row with its source
 * sheet. Filters are not offered in this mode, so one pass over the spreadsheet
 * is enough regardless of how many input items there are.
 */
async function readAllSheets(
	this: IExecuteFunctions,
	sheet: GoogleSheet,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const nodeVersion = this.getNode().typeVersion;
	const returnData: INodeExecutionData[] = [];

	for (const currentSheetName of await getGridSheetNames(sheet)) {
		try {
			const rows = await readSheet.call(this, sheet, currentSheetName, 0, [], nodeVersion, items);

			for (const row of rows) {
				returnData.push({
					// Row data spread last, so a column named `_sheetName` keeps its own value
					json: { [SHEET_NAME_FIELD]: currentSheetName, ...row.json },
					pairedItem: row.pairedItem,
				});
			}
		} catch (error) {
			const message = `Failed to read rows from sheet "${currentSheetName}": ${
				error instanceof Error ? error.message : String(error)
			}`;

			// Without this a single unreadable sheet would discard the rows already read
			if (this.continueOnFail()) {
				returnData.push({
					json: { [SHEET_NAME_FIELD]: currentSheetName, error: message },
					pairedItem: { item: 0 },
				});
				continue;
			}

			throw new NodeOperationError(this.getNode(), message);
		}
	}

	return returnData;
}

export async function execute(
	this: IExecuteFunctions,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	const sheetSelectionMode = this.getNodeParameter('sheetSelectionMode', 0, 'single') as string;

	if (sheetSelectionMode === 'all') {
		return await readAllSheets.call(this, sheet);
	}

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
