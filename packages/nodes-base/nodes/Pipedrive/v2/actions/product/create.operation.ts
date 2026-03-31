import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../transport';
import { encodeCustomFieldsV2 } from '../../helpers';
import { customFieldsCollection, encodeCustomFieldsOption } from '../common.description';

const properties: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		description: 'The name of the product',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Code',
				name: 'code',
				type: 'string',
				default: '',
				description: 'The product code',
			},
			{
				displayName: 'Owner ID',
				name: 'owner_id',
				type: 'number',
				default: 0,
				description: 'ID of the user who will be marked as the owner of this product',
			},
			{
				displayName: 'Prices',
				name: 'prices',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Price',
				options: [
					{
						displayName: 'Price',
						name: 'pricesValues',
						values: [
							{
								displayName: 'Price',
								name: 'price',
								type: 'number',
								default: 0,
								typeOptions: {
									numberPrecision: 2,
								},
								description: 'The price of the product',
							},
							{
								displayName: 'Currency',
								name: 'currency',
								type: 'string',
								default: 'USD',
								description: 'The currency of the price (3-letter code, e.g. USD, EUR)',
							},
							{
								displayName: 'Cost',
								name: 'cost',
								type: 'number',
								default: 0,
								typeOptions: {
									numberPrecision: 2,
								},
								description: 'The cost of the product',
							},
							{
								displayName: 'Overhead Cost',
								name: 'overhead_cost',
								type: 'number',
								default: 0,
								typeOptions: {
									numberPrecision: 2,
								},
								description: 'The overhead cost of the product',
							},
						],
					},
				],
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
			{
				displayName: 'Unit',
				name: 'unit',
				type: 'string',
				default: '',
				description: 'The unit in which this product is sold',
			},
			{
				displayName: 'Visible To',
				name: 'visible_to',
				type: 'options',
				default: '3',
				options: [
					{
						name: 'Owner & Followers (Private)',
						value: '1',
					},
					{
						name: 'Entire Company (Shared)',
						value: '3',
					},
				],
				description:
					'Visibility of the product. If omitted, visibility will be set to the default visibility setting of this item type for the authorized user.',
			},
			customFieldsCollection,
		],
	},
	encodeCustomFieldsOption,
];

const displayOptions = {
	show: {
		resource: ['product'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

function addAdditionalFields(body: IDataObject, additionalFields: IDataObject): void {
	for (const key of Object.keys(additionalFields)) {
		if (
			key === 'customFields' &&
			(additionalFields.customFields as IDataObject)?.property !== undefined
		) {
			for (const customProperty of (additionalFields.customFields as IDataObject)
				.property as Array<{ name: string; value: string }>) {
				body[customProperty.name] = customProperty.value;
			}
		} else if (key === 'prices') {
			const pricesInput = additionalFields.prices as IDataObject;
			if (pricesInput.pricesValues) {
				body.prices = pricesInput.pricesValues;
			}
		} else {
			body[key] = additionalFields[key];
		}
	}
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const encodeCustom = this.getNodeParameter('encodeCustomFields', 0, false) as boolean;
	let customProperties;
	if (encodeCustom) {
		customProperties = await pipedriveGetCustomProperties.call(this, 'product');
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const body: IDataObject = {};

			body.name = this.getNodeParameter('name', i) as string;

			const additionalFields = this.getNodeParameter('additionalFields', i);
			addAdditionalFields(body, additionalFields);

			if (customProperties) {
				encodeCustomFieldsV2(customProperties, body);
			}

			const responseData = await pipedriveApiRequest.call(this, 'POST', '/products', body);

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
