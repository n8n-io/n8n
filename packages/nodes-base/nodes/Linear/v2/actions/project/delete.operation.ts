import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { PROJECT_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [PROJECT_LOCATOR];

const displayOptions = {
	show: {
		resource: ['project'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const projectId = this.getNodeParameter('projectId', i, '', { extractValue: true }) as string;

	const body = {
		query: `mutation ProjectDelete($projectId: String!) {
			projectDelete(id: $projectId) {
				success
			}
		}`,
		variables: { projectId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const result = (responseData as { data: { projectDelete: IDataObject } }).data.projectDelete;

	return result as IDataObject;
}
