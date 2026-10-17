import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { WORKFLOW_STATE_LOCATOR } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [WORKFLOW_STATE_LOCATOR];

const displayOptions = {
	show: {
		resource: ['workflowState'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const workflowStateId = this.getNodeParameter('workflowStateId', i, '', {
		extractValue: true,
	}) as string;

	const body = {
		query: `query WorkflowState($workflowStateId: String!) {
			workflowState(id: $workflowStateId) {
				id
				name
				type
				color
				description
				position
				createdAt
				updatedAt
				team {
					id
					name
				}
			}
		}`,
		variables: { workflowStateId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const state = (responseData as { data: { workflowState: IDataObject } }).data.workflowState;

	return state as IDataObject;
}
