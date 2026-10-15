import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { CYCLE_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [CYCLE_LOCATOR];

const displayOptions = {
	show: {
		resource: ['cycle'],
		operation: ['archive'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const cycleId = this.getNodeParameter('cycleId', i, '', { extractValue: true }) as string;

	const body = {
		query: `mutation CycleArchive($cycleId: String!) {
			cycleArchive(id: $cycleId) {
				success
			}
		}`,
		variables: { cycleId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const result = (responseData as { data: { cycleArchive: IDataObject } }).data.cycleArchive;

	return result;
}
