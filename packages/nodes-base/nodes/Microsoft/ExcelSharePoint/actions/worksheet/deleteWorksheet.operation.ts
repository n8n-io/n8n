import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import {
	libraryRLC,
	siteRLC,
	workbookRLC,
	worksheetRLC,
} from '../../descriptions/common.descriptions';
import { resolveWorkbookRoot, validatePathSegment } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [workbookRLC, siteRLC, libraryRLC, worksheetRLC];

const displayOptions = {
	show: {
		resource: ['worksheet'],
		operation: ['deleteWorksheet'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	// https://learn.microsoft.com/en-us/graph/api/worksheet-delete
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const worksheetId = validatePathSegment(
				this.getNode(),
				'Sheet',
				this.getNodeParameter('worksheet', i, '', { extractValue: true }) as string,
			);

			const workbookRoot = await resolveWorkbookRoot.call(this, i);

			await microsoftApiRequest.call(
				this,
				'DELETE',
				`${workbookRoot}/workbook/worksheets/${encodeURIComponent(worksheetId)}`,
			);

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ success: true }),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (!this.continueOnFail()) throw error;

			const executionErrorData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ error: error.message }),
				{ itemData: { item: i } },
			);
			returnData.push(...executionErrorData);
		}
	}

	return returnData;
}
