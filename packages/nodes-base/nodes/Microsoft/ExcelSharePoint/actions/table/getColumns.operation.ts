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
import { resolveTableEndpoint } from '../../helpers/tableRead';
import { fetchCollection, runPerItem } from '../../helpers/utils';

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
		operation: ['getColumns'],
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
		const rawData = this.getNodeParameter('rawData', i);
		const options = this.getNodeParameter('options', i, {}) as { fields?: string };

		const qs: IDataObject = {};
		if (rawData && options.fields) {
			qs.$select = options.fields;
		}

		const tableEndpoint = await resolveTableEndpoint.call(this, i, workbookRootCache, siteIdCache);
		const columns = await fetchCollection.call(this, i, `${tableEndpoint}/columns`, qs);

		if (rawData) {
			return { [this.getNodeParameter('dataProperty', i) as string]: columns };
		}
		return columns.map((column) => ({ name: column.name }));
	});
}
