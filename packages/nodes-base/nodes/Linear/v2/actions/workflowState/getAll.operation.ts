import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { TEAM_LOCATOR } from '../../../shared/constants';
import { extractLocatorIds, linearApiRequestAllItems } from '../../../shared/GenericFunctions';
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
		displayOptions: { show: { returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [{ ...TEAM_LOCATOR, required: false }],
	},
];

const displayOptions = {
	show: {
		resource: ['workflowState'],
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
	const filters = this.getNodeParameter('filters', i) as IDataObject;
	extractLocatorIds(this, filters, 'filters', i);

	const filter: IDataObject = {};
	if (filters.teamId) filter.team = { id: { eq: filters.teamId } };

	const body = {
		query: `query WorkflowStates($first: Int, $after: String, $filter: WorkflowStateFilter) {
			workflowStates(first: $first, after: $after, filter: $filter) {
				nodes {
					id
					name
					type
					color
					description
					position
					createdAt
					updatedAt
					team {
						id
						name
					}
				}
				pageInfo { hasNextPage endCursor }
			}
		}`,
		variables: {
			...(Object.keys(filter).length > 0 ? { filter } : {}),
		},
	};

	const states = await linearApiRequestAllItems.call(this, 'data.workflowStates', body, limit);
	return states;
}
