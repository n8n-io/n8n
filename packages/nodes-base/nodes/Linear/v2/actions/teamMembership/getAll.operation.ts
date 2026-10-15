import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

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
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
	const returnAll = this.getNodeParameter('returnAll', i) as boolean;
	const limit = returnAll ? undefined : (this.getNodeParameter('limit', i) as number);

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
		variables: { teamId },
	};

	const memberships = await linearApiRequestAllItems.call(
		this,
		'data.team.memberships',
		body,
		limit,
	);
	return memberships;
}
