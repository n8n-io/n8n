import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { PROJECT_UPDATE_FIELDS, PROJECT_UPDATE_HEALTH_OPTIONS } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Project Update ID',
		name: 'projectUpdateId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the project update to modify',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
			},
			{
				displayName: 'Health',
				name: 'health',
				type: 'options',
				options: PROJECT_UPDATE_HEALTH_OPTIONS,
				default: 'onTrack',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['projectUpdate'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const projectUpdateId = this.getNodeParameter('projectUpdateId', i) as string;
	const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

	const body = {
		query: `mutation ProjectUpdateUpdate($projectUpdateId: String!, $body: String, $health: ProjectUpdateHealthType) {
			projectUpdateUpdate(id: $projectUpdateId, input: {
				body: $body
				health: $health
			}) {
				success
				projectUpdate {
					${PROJECT_UPDATE_FIELDS}
				}
			}
		}`,
		variables: { projectUpdateId, ...updateFields },
	};

	const responseData = await linearApiRequest.call(this, body);
	const projectUpdate = (
		responseData as { data: { projectUpdateUpdate: { projectUpdate: IDataObject } } }
	).data.projectUpdateUpdate?.projectUpdate;

	return projectUpdate;
}
