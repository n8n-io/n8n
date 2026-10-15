import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { PROJECT_LOCATOR, PROJECT_MILESTONE_FIELDS } from '../../../shared/constants';
import { linearApiRequest, normalizeTimelessDates } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	PROJECT_LOCATOR,
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the milestone',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
			},
			{
				displayName: 'Target Date',
				name: 'targetDate',
				type: 'dateTime',
				typeOptions: { dateOnly: true },
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['projectMilestone'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const projectId = this.getNodeParameter('projectId', i, '', { extractValue: true }) as string;
	const name = this.getNodeParameter('name', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
	normalizeTimelessDates(additionalFields);

	const body = {
		query: `mutation ProjectMilestoneCreate($name: String!, $projectId: String!, $description: String, $targetDate: TimelessDate) {
			projectMilestoneCreate(input: {
				name: $name
				projectId: $projectId
				description: $description
				targetDate: $targetDate
			}) {
				success
				projectMilestone {
					${PROJECT_MILESTONE_FIELDS}
				}
			}
		}`,
		variables: { name, projectId, ...additionalFields },
	};

	const responseData = await linearApiRequest.call(this, body);
	const milestone = (
		responseData as { data: { projectMilestoneCreate: { projectMilestone: IDataObject } } }
	).data.projectMilestoneCreate?.projectMilestone;

	return milestone;
}
