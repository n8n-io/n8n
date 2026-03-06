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
		displayName: 'Roadmap ID',
		name: 'roadmapId',
		type: 'string',
		required: true,
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['roadmap'],
		operation: ['delete'],
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
			const roadmapId = this.getNodeParameter('roadmapId', i) as string;

			const body = {
				query: `mutation RoadmapDelete($roadmapId: String!) {
					roadmapDelete(id: $roadmapId) {
						success
					}
				}`,
				variables: { roadmapId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const result = (responseData as { data: { roadmapDelete: IDataObject } }).data.roadmapDelete;

			returnData.push(
				...this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(result as IDataObject),
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
