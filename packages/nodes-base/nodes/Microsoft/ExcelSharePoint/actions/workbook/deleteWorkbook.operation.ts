import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { libraryRLC, siteRLC, workbookRLC } from '../../descriptions/common.descriptions';
import { resolveWorkbookRoot } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [workbookRLC, siteRLC, libraryRLC];

const displayOptions = {
	show: {
		resource: ['workbook'],
		operation: ['deleteWorkbook'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	// https://learn.microsoft.com/en-us/graph/api/driveitem-delete
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			// The file itself, not a `/workbook` subpath — deleting the item removes
			// the workbook whole, so no session is opened for this operation.
			const workbookRoot = await resolveWorkbookRoot.call(this, i);
			await microsoftApiRequest.call(this, 'DELETE', workbookRoot);

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ success: true }),
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
