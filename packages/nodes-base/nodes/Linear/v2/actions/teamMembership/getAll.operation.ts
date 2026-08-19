import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { TEAM_LOCATOR } from '../../../shared/constants';
import { linearApiRequestAllItems } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	TEAM_LOCATOR,
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
		resource: ['teamMembership'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	_items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const teamId = this.getNodeParameter('teamId', 0, '', { extractValue: true }) as string;
	const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
	const limit = returnAll ? undefined : (this.getNodeParameter('limit', 0) as number);

	const body = {
		query: `query TeamMemberships($teamId: String!, $first: Int, $after: String) {
			team(id: $teamId) {
				memberships(first: $first, after: $after) {
					nodes {
						id
						owner
						sortOrder
						user {
							id
							name
							displayName
							email
							avatarUrl
							active
						}
					}
					pageInfo { hasNextPage endCursor }
				}
			}
		}`,
		variables: { teamId, first: 50 },
	};

	try {
		const memberships = await linearApiRequestAllItems.call(
			this,
			'data.team.memberships',
			body,
			limit,
		);
		returnData.push(
			...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(memberships), {
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
