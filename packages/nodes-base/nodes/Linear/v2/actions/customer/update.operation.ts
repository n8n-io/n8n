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
		description: 'The ID of the customer to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Domains',
				name: 'domains',
				type: 'string',
				default: '',
				description: 'Comma-separated list of company domains',
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
		resource: ['customer'],
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
			const customerId = this.getNodeParameter('customerId', i) as string;
			const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

			const variables: IDataObject = { customerId };
			if (updateFields.name) variables.name = updateFields.name;
			if (updateFields.domains) {
				variables.domains = (updateFields.domains as string)
					.split(',')
					.map((d) => d.trim())
					.filter(Boolean);
			}

			const body = {
				query: `mutation CustomerUpdate($customerId: String!, $name: String, $domains: [String!]) {
					customerUpdate(id: $customerId, input: { name: $name, domains: $domains }) {
						success
						customer {
							${CUSTOMER_FIELDS}
						}
					}
				}`,
				variables,
			};

			const responseData = await linearApiRequest.call(this, body);
			const customer = (responseData as { data: { customerUpdate: { customer: IDataObject } } })
				.data.customerUpdate?.customer;

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
