import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest } from '../../transport';
import { coerceToNumber } from '../../helpers';

const properties: INodeProperties[] = [
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'number',
		default: 0,
		required: true,
		description: 'ID of the deal to add a product to',
	},
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'number',
		default: 0,
		required: true,
		description: 'ID of the product to add to the deal',
	},
	{
		displayName: 'Item Price',
		name: 'item_price',
		type: 'number',
		typeOptions: {
			numberPrecision: 2,
		},
		default: 0,
		required: true,
		description: 'Price at which to add this product to the deal',
	},
	{
		displayName: 'Quantity',
		name: 'quantity',
		type: 'number',
		default: 1,
		typeOptions: {
			minValue: 1,
		},
		required: true,
		description: 'How many items of this product to add to the deal',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Comments',
				name: 'comments',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'Text to describe this product-deal attachment',
			},
			{
				displayName: 'Discount',
				name: 'discount',
				type: 'number',
				default: 0,
				description:
					'The value of the discount. The discount type can be specified in discount_type.',
			},
			{
				displayName: 'Discount Type',
				name: 'discount_type',
				type: 'options',
				default: 'percentage',
				options: [
					{
						name: 'Percentage',
						value: 'percentage',
					},
					{
						name: 'Amount',
						value: 'amount',
					},
				],
				description: 'The type of the discount',
			},
			{
				displayName: 'Tax',
				name: 'tax',
				type: 'number',
				default: 0,
				description: 'The tax percentage',
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['dealProduct'],
		operation: ['add'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const dealId = this.getNodeParameter('dealId', i) as number;

			const body: IDataObject = {
				product_id: this.getNodeParameter('productId', i) as number,
				item_price: coerceToNumber(this.getNodeParameter('item_price', i)),
				quantity: coerceToNumber(this.getNodeParameter('quantity', i)),
			};

			const additionalFields = this.getNodeParameter('additionalFields', i);
			Object.assign(body, additionalFields);

			if (body.discount !== undefined) {
				body.discount = coerceToNumber(body.discount);
			}
			if (body.tax !== undefined) {
				body.tax = coerceToNumber(body.tax);
			}

			const responseData = await pipedriveApiRequest.call(
				this,
				'POST',
				`/deals/${dealId}/products`,
				body,
			);

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData.data as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
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
