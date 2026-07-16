import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { ISSUE_FIELDS } from '../../../shared/constants';
import { linearApiRequestAllItems } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		description: 'Text to search for in issue titles and descriptions',
	},
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
		resource: ['issue'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	_items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const searchQuery = this.getNodeParameter('query', 0) as string;
	const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
	const limit = returnAll ? undefined : (this.getNodeParameter('limit', 0) as number);

	const body = {
		query: `query IssueSearch($first: Int, $after: String, $filter: IssueFilter) {
			issues(first: $first, after: $after, filter: $filter) {
				nodes {
					${ISSUE_FIELDS}
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}`,
		variables: {
			first: 50,
			filter: {
				or: [
					{ title: { containsIgnoreCase: searchQuery } },
					{ description: { containsIgnoreCase: searchQuery } },
				],
			},
		},
	};

	try {
		const issues = await linearApiRequestAllItems.call(this, 'data.issues', body, limit);

		const executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(issues),
			{ itemData: { item: 0 } },
		);
		returnData.push(...executionData);
	} catch (error) {
		if (this.continueOnFail()) {
			returnData.push(
				...this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: (error as Error).message }),
					{ itemData: { item: 0 } },
				),
			);
		} else {
			throw error;
		}
	}

	return returnData;
}
