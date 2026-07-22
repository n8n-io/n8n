import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import {
	libraryRLC,
	siteRLC,
	tableRLC,
	workbookRLC,
	worksheetRLC,
} from '../../descriptions/common.descriptions';
import { resolveTableEndpoint } from '../../helpers/tableRead';
import { runPerItem } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [siteRLC, libraryRLC, workbookRLC, worksheetRLC, tableRLC];

const displayOptions = {
	show: {
		resource: ['table'],
		operation: ['convertToRange'],
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
		const tableEndpoint = await resolveTableEndpoint.call(this, i, workbookRootCache, siteIdCache);
		return await microsoftApiRequest.call(this, 'POST', `${tableEndpoint}/convertToRange`);
	});
}
