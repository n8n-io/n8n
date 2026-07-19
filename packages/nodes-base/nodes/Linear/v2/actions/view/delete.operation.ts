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
		displayName: 'View ID',
		name: 'viewId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the view to delete',
	},
];

const displayOptions = {
	show: {
		resource: ['view'],
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
			const viewId = this.getNodeParameter('viewId', i) as string;

			const body = {
				query: `mutation CustomViewDelete($viewId: String!) {
					customViewDelete(id: $viewId) {
						success
					}
				}`,
				variables: { viewId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const result = (responseData as { data: { customViewDelete: IDataObject } }).data
				.customViewDelete;

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(result), {
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
