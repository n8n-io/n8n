import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { PROJECT_LOCATOR, PROJECT_UPDATE_FIELDS } from '../../../shared/constants';
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
		resource: ['projectUpdate'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const projectId = this.getNodeParameter('projectId', i, '', { extractValue: true }) as string;
	const returnAll = this.getNodeParameter('returnAll', i) as boolean;
	const limit = returnAll ? undefined : (this.getNodeParameter('limit', i) as number);

	const body = {
		query: `query ProjectUpdates($projectId: String!, $first: Int, $after: String) {
			project(id: $projectId) {
				projectUpdates(first: $first, after: $after) {
					nodes {
						${PROJECT_UPDATE_FIELDS}
					}
					pageInfo {
						hasNextPage
						endCursor
					}
				}
			}
		}`,
		variables: { projectId },
	};

	const updates = await linearApiRequestAllItems.call(
		this,
		'data.project.projectUpdates',
		body,
		limit,
	);
	return updates;
}
