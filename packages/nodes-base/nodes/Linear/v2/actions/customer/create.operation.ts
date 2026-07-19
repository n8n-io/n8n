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
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the customer',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Domains',
				name: 'domains',
				type: 'string',
				default: '',
				description: 'Comma-separated list of company domains (e.g. acme.com)',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['customer'],
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
			const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

			const variables: IDataObject = { name };
			if (additionalFields.domains) {
				variables.domains = (additionalFields.domains as string)
					.split(',')
					.map((d) => d.trim())
					.filter(Boolean);
			}

			const body = {
				query: `mutation CustomerCreate($name: String!, $domains: [String!]) {
					customerCreate(input: { name: $name, domains: $domains }) {
						success
						customer {
							${CUSTOMER_FIELDS}
						}
					}
				}`,
				variables,
			};

			const responseData = await linearApiRequest.call(this, body);
			const customer = (responseData as { data: { customerCreate: { customer: IDataObject } } })
				.data.customerCreate?.customer;

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
