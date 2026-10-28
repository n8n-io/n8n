import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Project Update ID',
		name: 'projectUpdateId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the project update to delete',
	},
];

const displayOptions = {
	show: {
		resource: ['projectUpdate'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const projectUpdateId = this.getNodeParameter('projectUpdateId', i) as string;

	const body = {
		query: `mutation ProjectUpdateDelete($projectUpdateId: String!) {
			projectUpdateDelete(id: $projectUpdateId) {
				success
			}
		}`,
		variables: { projectUpdateId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const result = (responseData as { data: { projectUpdateDelete: IDataObject } }).data
		.projectUpdateDelete;

	return result;
}
