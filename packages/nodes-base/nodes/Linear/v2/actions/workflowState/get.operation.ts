import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Workflow State ID',
		name: 'workflowStateId',
		type: 'string',
		required: true,
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['workflowState'],
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
			const workflowStateId = this.getNodeParameter('workflowStateId', i) as string;

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

			returnData.push(
				...this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(state as IDataObject),
					{
						itemData: { item: i },
					},
				),
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
