import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import {
	libraryRLC,
	siteRLC,
	tableRLC,
	workbookRLC,
	worksheetRLC,
} from '../../descriptions/common.descriptions';
import type { GraphTableRow } from '../../helpers/tableRead';
import {
	fetchTableColumnNames,
	resolveTableEndpoint,
	rowsToObjects,
} from '../../helpers/tableRead';
import { microsoftApiRequestAllItems } from '../../transport';

const properties: INodeProperties[] = [
	siteRLC,
	libraryRLC,
	workbookRLC,
	worksheetRLC,
	tableRLC,
	{
		displayName: 'Lookup Column',
		name: 'lookupColumn',
		type: 'string',
		default: '',
		placeholder: 'e.g. Email',
		required: true,
		description: 'The name of the column in which to look for value',
	},
	{
		displayName: 'Lookup Value',
		name: 'lookupValue',
		type: 'string',
		default: '',
		placeholder: 'e.g. frank@example.com',
		required: true,
		description: 'The value to look for in column',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Return All Matches',
				name: 'returnAllMatches',
				type: 'boolean',
				default: false,
				description: 'Whether to return every matching row instead of only the first one',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['table'],
		operation: ['lookup'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	// https://learn.microsoft.com/en-us/graph/api/table-list-rows
	const returnData: INodeExecutionData[] = [];

	const workbookRootCache = new Map<string, string>();
	const siteIdCache = new Map<string, string>();

	for (let i = 0; i < items.length; i++) {
		try {
			const lookupColumn = this.getNodeParameter('lookupColumn', i) as string;
			const lookupValue = this.getNodeParameter('lookupValue', i) as string;
			const options = this.getNodeParameter('options', i, {}) as { returnAllMatches?: boolean };

			const tableEndpoint = await resolveTableEndpoint.call(
				this,
				i,
				workbookRootCache,
				siteIdCache,
			);
			const rows = await (microsoftApiRequestAllItems<GraphTableRow>).call(
				this,
				`${tableEndpoint}/rows`,
			);
			const columnNames = await fetchTableColumnNames.call(this, tableEndpoint);

			if (!columnNames.includes(lookupColumn)) {
				throw new NodeOperationError(
					this.getNode(),
					`Column ${lookupColumn} does not exist on the table selected`,
					{ itemIndex: i },
				);
			}

			const matches = rowsToObjects(columnNames, rows).filter(
				(row) => row[lookupColumn]?.toString() === lookupValue,
			);
			// No match yields no output item, rather than the OneDrive node's
			// single item with an undefined body.
			const output = options.returnAllMatches ? matches : matches.slice(0, 1);

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(output),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionData);
		} catch (error) {
			if (!this.continueOnFail()) throw error;

			const executionErrorData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ error: error.message }),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionErrorData);
		}
	}

	return returnData;
}
