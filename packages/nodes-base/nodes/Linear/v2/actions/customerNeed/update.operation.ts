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
		description: 'The ID of the customer need to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'number',
				default: 0,
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['customerNeed'],
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
			const customerNeedId = this.getNodeParameter('customerNeedId', i) as string;
			const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

			const body = {
				query: `mutation CustomerNeedUpdate($customerNeedId: String!, $body: String, $priority: Float) {
					customerNeedUpdate(id: $customerNeedId, input: {
						body: $body
						priority: $priority
					}) {
						success
						need {
							${CUSTOMER_NEED_FIELDS}
						}
					}
				}`,
				variables: { customerNeedId, ...updateFields },
			};

			const responseData = await linearApiRequest.call(this, body);
			const need = (responseData as { data: { customerNeedUpdate: { need: IDataObject } } }).data
				.customerNeedUpdate?.need;

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
