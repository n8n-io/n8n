import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { RELEASE_FIELDS, RELEASE_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [RELEASE_LOCATOR];

const displayOptions = {
	show: {
		resource: ['release'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const releaseId = this.getNodeParameter('releaseId', i, '', { extractValue: true }) as string;

	const body = {
		query: `query Release($releaseId: String!) {
			release(id: $releaseId) {
				${RELEASE_FIELDS}
			}
		}`,
		variables: { releaseId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const release = (responseData as { data: { release: IDataObject } }).data.release;

	return release;
}
