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
		description: 'The ID of the milestone to retrieve',
	},
];

const displayOptions = {
	show: {
		resource: ['projectMilestone'],
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
			const projectMilestoneId = this.getNodeParameter('projectMilestoneId', i) as string;

			const body = {
				query: `query ProjectMilestone($projectMilestoneId: String!) {
					projectMilestone(id: $projectMilestoneId) {
						${PROJECT_MILESTONE_FIELDS}
					}
				}`,
				variables: { projectMilestoneId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const milestone = (responseData as { data: { projectMilestone: IDataObject } }).data
				.projectMilestone;

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
