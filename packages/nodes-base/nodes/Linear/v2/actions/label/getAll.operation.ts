import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { linearApiRequestAllItems } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
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
		displayOptions: {
			show: { returnAll: [false] },
		},
		description: 'Max number of results to return',
	},
];

const displayOptions = {
	show: {
		resource: ['label'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const returnAll = this.getNodeParameter('returnAll', i) as boolean;
	const limit = returnAll ? undefined : (this.getNodeParameter('limit', i) as number);

	const body = {
		query: `query IssueLabels($first: Int, $after: String) {
			issueLabels(first: $first, after: $after) {
				nodes {
					id
					name
					color
					description
					createdAt
					updatedAt
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}`,
		variables: {},
	};

	const labels = await linearApiRequestAllItems.call(this, 'data.issueLabels', body, limit);

	return labels;
}
