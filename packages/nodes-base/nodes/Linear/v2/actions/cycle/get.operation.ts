import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { CYCLE_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [CYCLE_LOCATOR];

const displayOptions = {
	show: {
		resource: ['cycle'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const cycleId = this.getNodeParameter('cycleId', i, '', { extractValue: true }) as string;

			const body = {
				query: `query Cycle($cycleId: String!) {
					cycle(id: $cycleId) {
						id
						name
						number
						startsAt
						endsAt
						archivedAt
						createdAt
						updatedAt
						team {
							id
							name
						}
					}
				}`,
				variables: { cycleId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const cycle = (responseData as { data: { cycle: IDataObject } }).data.cycle;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(cycle),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push(
					...this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					),
				);
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
