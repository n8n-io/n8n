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
		],
	},
];

const displayOptions = {
	show: {
		resource: ['roadmap'],
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
			const roadmapId = this.getNodeParameter('roadmapId', i) as string;
			const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

			const body = {
				query: `mutation RoadmapUpdate($roadmapId: String!, $name: String, $description: String) {
					roadmapUpdate(id: $roadmapId, input: {
						name: $name
						description: $description
					}) {
						success
						roadmap {
							id
							name
							description
							updatedAt
						}
					}
				}`,
				variables: { roadmapId, ...updateFields },
			};

			const responseData = await linearApiRequest.call(this, body);
			const roadmap = (responseData as { data: { roadmapUpdate: { roadmap: IDataObject } } }).data
				.roadmapUpdate?.roadmap;

			returnData.push(
				...this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(roadmap as IDataObject),
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
