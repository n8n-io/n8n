import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { PROJECT_LOCATOR, PROJECT_MILESTONE_FIELDS } from '../../../shared/constants';
import { linearApiRequestAllItems } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	PROJECT_LOCATOR,
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
		resource: ['projectMilestone'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	_items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const projectId = this.getNodeParameter('projectId', 0, '', { extractValue: true }) as string;
	const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
	const limit = returnAll ? undefined : (this.getNodeParameter('limit', 0) as number);

	const body = {
		query: `query ProjectMilestones($projectId: String!, $first: Int, $after: String) {
			project(id: $projectId) {
				projectMilestones(first: $first, after: $after) {
					nodes {
						${PROJECT_MILESTONE_FIELDS}
					}
					pageInfo {
						hasNextPage
						endCursor
					}
				}
			}
		}`,
		variables: { projectId, first: 50 },
	};

	try {
		const milestones = await linearApiRequestAllItems.call(
			this,
			'data.project.projectMilestones',
			body,
			limit,
		);
		returnData.push(
			...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(milestones), {
				itemData: { item: 0 },
			}),
		);
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
