import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { CUSTOMER_NEED_FIELDS } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Customer Need ID',
		name: 'customerNeedId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the customer need to retrieve',
	},
];

const displayOptions = {
	show: {
		resource: ['customerNeed'],
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
			const customerNeedId = this.getNodeParameter('customerNeedId', i) as string;

			const body = {
				query: `query CustomerNeed($customerNeedId: String!) {
					customerNeed(id: $customerNeedId) {
						${CUSTOMER_NEED_FIELDS}
					}
				}`,
				variables: { customerNeedId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const need = (responseData as { data: { customerNeed: IDataObject } }).data.customerNeed;

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(need), {
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
