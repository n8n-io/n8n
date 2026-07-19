import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { CUSTOMER_FIELDS } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the customer to retrieve',
	},
];

const displayOptions = {
	show: {
		resource: ['customer'],
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
			const customerId = this.getNodeParameter('customerId', i) as string;

			const body = {
				query: `query Customer($customerId: String!) {
					customer(id: $customerId) {
						${CUSTOMER_FIELDS}
					}
				}`,
				variables: { customerId },
			};

			const responseData = await linearApiRequest.call(this, body);
			const customer = (responseData as { data: { customer: IDataObject } }).data.customer;

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(customer), {
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
