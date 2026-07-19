import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { CUSTOM_VIEW_FIELDS } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'View ID',
		name: 'viewId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the view to update',
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
				typeOptions: { rows: 3 },
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
		resource: ['view'],
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
			const viewId = this.getNodeParameter('viewId', i) as string;
			const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

			const body = {
				query: `mutation CustomViewUpdate($viewId: String!, $name: String, $description: String) {
					customViewUpdate(id: $viewId, input: {
						name: $name
						description: $description
					}) {
						success
						customView {
							${CUSTOM_VIEW_FIELDS}
						}
					}
				}`,
				variables: { viewId, ...updateFields },
			};

			const responseData = await linearApiRequest.call(this, body);
			const customView = (
				responseData as { data: { customViewUpdate: { customView: IDataObject } } }
			).data.customViewUpdate?.customView;

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(customView), {
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
