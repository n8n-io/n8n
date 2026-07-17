import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { PROJECT_MILESTONE_FIELDS } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Milestone ID',
		name: 'projectMilestoneId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the milestone to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
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
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Target Date',
				name: 'targetDate',
				type: 'dateTime',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['projectMilestone'],
		operation: ['update'],
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
			const projectMilestoneId = this.getNodeParameter('projectMilestoneId', i) as string;
			const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

			const body = {
				query: `mutation ProjectMilestoneUpdate($projectMilestoneId: String!, $name: String, $description: String, $targetDate: TimelessDate) {
					projectMilestoneUpdate(id: $projectMilestoneId, input: {
						name: $name
						description: $description
						targetDate: $targetDate
					}) {
						success
						projectMilestone {
							${PROJECT_MILESTONE_FIELDS}
						}
					}
				}`,
				variables: { projectMilestoneId, ...updateFields },
			};

			const responseData = await linearApiRequest.call(this, body);
			const milestone = (
				responseData as { data: { projectMilestoneUpdate: { projectMilestone: IDataObject } } }
			).data.projectMilestoneUpdate?.projectMilestone;

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(milestone), {
					itemData: { item: i },
				}),
			);
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
