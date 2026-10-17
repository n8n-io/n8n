import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { ISSUE_FIELDS, ISSUE_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [ISSUE_LOCATOR];

const displayOptions = {
	show: {
		resource: ['issue'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const issueId = this.getNodeParameter('issueId', i, '', { extractValue: true }) as string;

	const body = {
		query: `query Issue($issueId: String!) {
			issue(id: $issueId) {
				${ISSUE_FIELDS}
			}
		}`,
		variables: { issueId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const issue = (responseData as { data: { issue: IDataObject } }).data.issue;

	return issue;
}
