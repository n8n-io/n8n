import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { ISSUE_LOCATOR } from '../../../shared/constants';
import { linearApiRequestAllItems } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	ISSUE_LOCATOR,
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { returnAll: [false] } },
		description: 'Max number of results to return',
	},
];

const displayOptions = {
	show: {
		resource: ['attachment'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const issueId = this.getNodeParameter('issueId', i, '', { extractValue: true }) as string;
	const returnAll = this.getNodeParameter('returnAll', i) as boolean;
	const limit = returnAll ? undefined : (this.getNodeParameter('limit', i) as number);

	const body = {
		query: `query IssueAttachments($issueId: String!, $first: Int, $after: String) {
			issue(id: $issueId) {
				attachments(first: $first, after: $after) {
					nodes {
						id
						url
						title
						subtitle
						createdAt
						updatedAt
					}
					pageInfo { hasNextPage endCursor }
				}
			}
		}`,
		variables: { issueId },
	};

	const attachments = await linearApiRequestAllItems.call(
		this,
		'data.issue.attachments',
		body,
		limit,
	);
	return attachments;
}
