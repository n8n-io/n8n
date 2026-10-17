import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { RELEASE_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [RELEASE_LOCATOR];

const displayOptions = {
	show: {
		resource: ['release'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const releaseId = this.getNodeParameter('releaseId', i, '', { extractValue: true }) as string;

	const body = {
		query: `mutation ReleaseDelete($releaseId: String!) {
			releaseDelete(id: $releaseId) {
				success
			}
		}`,
		variables: { releaseId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const result = (responseData as { data: { releaseDelete: IDataObject } }).data.releaseDelete;

	return result;
}
