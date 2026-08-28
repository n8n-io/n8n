import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { ISSUE_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [ISSUE_LOCATOR];

const displayOptions = {
	show: {
		resource: ['issue'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const issueId = this.getNodeParameter('issueId', i, '', { extractValue: true }) as string;

			const body = {
				query: `mutation IssueDelete($issueId: String!) {
					issueDelete(id: $issueId) {
						success
					}
				}`,
				variables: { issueId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const result = (responseData as { data: { issueDelete: IDataObject } }).data.issueDelete;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(result),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push(
					...this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					),
				);
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
