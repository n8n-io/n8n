import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { PROJECT_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [PROJECT_LOCATOR];

const displayOptions = {
	show: {
		resource: ['project'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const projectId = this.getNodeParameter('projectId', i, '', { extractValue: true }) as string;

	const body = {
		query: `query Project($projectId: String!) {
			project(id: $projectId) {
				id
				name
				description
				state
				createdAt
				updatedAt
				targetDate
				url
				lead {
					id
					displayName
					email
				}
			}
		}`,
		variables: { projectId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const project = (responseData as { data: { project: IDataObject } }).data.project;

	return project as IDataObject;
}
