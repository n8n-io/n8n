import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

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
	i: number,
): Promise<IDataObject | IDataObject[]> {
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

	return result;
}
