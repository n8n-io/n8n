import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the customer to delete',
	},
];

const displayOptions = {
	show: {
		resource: ['customer'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const customerId = this.getNodeParameter('customerId', i) as string;

	const body = {
		query: `mutation CustomerDelete($customerId: String!) {
			customerDelete(id: $customerId) {
				success
			}
		}`,
		variables: { customerId },
	};

	const responseData = await linearApiRequest.call(this, body);
	const result = (responseData as { data: { customerDelete: IDataObject } }).data.customerDelete;

	return result;
}
