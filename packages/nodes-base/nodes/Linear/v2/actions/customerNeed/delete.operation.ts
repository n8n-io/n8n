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
		displayName: 'Customer Need ID',
		name: 'customerNeedId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the customer need to delete',
	},
];

const displayOptions = {
	show: {
		resource: ['customerNeed'],
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
			const customerNeedId = this.getNodeParameter('customerNeedId', i) as string;

			const body = {
				query: `mutation CustomerNeedDelete($customerNeedId: String!) {
					customerNeedDelete(id: $customerNeedId) {
						success
					}
				}`,
				variables: { customerNeedId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const result = (responseData as { data: { customerNeedDelete: IDataObject } }).data
				.customerNeedDelete;

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
