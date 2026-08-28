import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { PROJECT_UPDATE_FIELDS } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Project Update ID',
		name: 'projectUpdateId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the project update to retrieve',
	},
];

const displayOptions = {
	show: {
		resource: ['projectUpdate'],
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
			const projectUpdateId = this.getNodeParameter('projectUpdateId', i) as string;

			const body = {
				query: `query ProjectUpdate($projectUpdateId: String!) {
					projectUpdate(id: $projectUpdateId) {
						${PROJECT_UPDATE_FIELDS}
					}
				}`,
				variables: { projectUpdateId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const projectUpdate = (responseData as { data: { projectUpdate: IDataObject } }).data
				.projectUpdate;

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(projectUpdate), {
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
