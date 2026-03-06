import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

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
		displayOptions: { show: { returnAll: [false] } },
		description: 'Max number of results to return',
	},
];

const displayOptions = {
	show: {
		resource: ['roadmap'],
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

	const body = {
		query: `query Roadmaps($first: Int, $after: String) {
			roadmaps(first: $first, after: $after) {
				nodes {
					id
					name
					description
					createdAt
					updatedAt
				}
				pageInfo { hasNextPage endCursor }
			}
		}`,
		variables: { first: 50 },
	};

	try {
		const roadmaps = await linearApiRequestAllItems.call(this, 'data.roadmaps', body, limit);
		returnData.push(
			...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(roadmaps), {
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
