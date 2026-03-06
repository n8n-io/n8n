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
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
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
		],
	},
];

const displayOptions = {
	show: {
		resource: ['roadmap'],
		operation: ['create'],
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
			const name = this.getNodeParameter('name', i) as string;
			const additionalFields = this.getNodeParameter('additionalFields', i) as Record<
				string,
				unknown
			>;

			const body = {
				query: `mutation RoadmapCreate($name: String!, $description: String) {
					roadmapCreate(input: {
						name: $name
						description: $description
					}) {
						success
						roadmap {
							id
							name
							description
							createdAt
							updatedAt
						}
					}
				}`,
				variables: { name, ...additionalFields },
			};

			const responseData = await linearApiRequest.call(this, body);
			const roadmap = (responseData as { data: { roadmapCreate: { roadmap: IDataObject } } }).data
				.roadmapCreate?.roadmap;

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
