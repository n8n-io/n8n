import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import {
	libraryRLC,
	rawDataOutput,
	returnAllAndLimit,
	siteRLC,
	tableRLC,
	workbookRLC,
	worksheetRLC,
} from '../../descriptions/common.descriptions';
import type { GraphTableRow } from '../../helpers/tableRead';
import {
	fetchTableCollection,
	fetchTableColumnNames,
	resolveTableEndpoint,
	rowsToObjects,
} from '../../helpers/tableRead';

const properties: INodeProperties[] = [
	siteRLC,
	libraryRLC,
	workbookRLC,
	worksheetRLC,
	tableRLC,
	...returnAllAndLimit,
	...rawDataOutput,
];

const displayOptions = {
	show: {
		resource: ['table'],
		operation: ['getRows'],
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
			const rawData = this.getNodeParameter('rawData', i);
			const options = this.getNodeParameter('options', i, {}) as { fields?: string };

			const qs: IDataObject = {};
			if (rawData && options.fields) {
				qs.$select = options.fields;
			}

			const tableEndpoint = await resolveTableEndpoint.call(
				this,
				i,
				workbookRootCache,
				siteIdCache,
			);
			const rows = await (fetchTableCollection<GraphTableRow>).call(
				this,
				i,
				`${tableEndpoint}/rows`,
				qs,
			);

			let output: IDataObject | IDataObject[];
			if (rawData) {
				output = { [this.getNodeParameter('dataProperty', i) as string]: rows };
			} else {
				output = rowsToObjects(await fetchTableColumnNames.call(this, tableEndpoint), rows);
			}

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
