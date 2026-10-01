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
import { runPerItem } from '../../helpers/utils';
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
	const workbookRootCache = new Map<string, string>();
	const siteIdCache = new Map<string, string>();

	return await runPerItem.call(this, items, async (i) => {
		const lookupColumn = this.getNodeParameter('lookupColumn', i) as string;
		const lookupValue = this.getNodeParameter('lookupValue', i) as string;
		const options = this.getNodeParameter('options', i, {}) as { returnAllMatches?: boolean };

		const tableEndpoint = await resolveTableEndpoint.call(this, i, workbookRootCache, siteIdCache);
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
		return options.returnAllMatches ? matches : matches.slice(0, 1);
	});
}
