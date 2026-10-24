import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

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
	i: number,
): Promise<IDataObject | IDataObject[]> {
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

	return result;
}
