import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

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
	_items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
	const limit = returnAll ? undefined : (this.getNodeParameter('limit', 0) as number);
	const filters = this.getNodeParameter('filters', 0) as IDataObject;
	extractLocatorIds(this, filters, 'filters', 0);

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
			first: 50,
			...(Object.keys(filter).length > 0 ? { filter } : {}),
		},
	};

	try {
		const states = await linearApiRequestAllItems.call(this, 'data.workflowStates', body, limit);
		returnData.push(
			...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(states), {
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
