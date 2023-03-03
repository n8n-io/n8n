import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';
import type { IProduct } from './ProductInterface';

export const execute = async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;
	const qs: IDataObject = {};

	let responseData;

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	if (resource !== 'product') throw new Error('Invalid Resource Execution Handler');

	for (let i = 0; i < length; i++) {
		//Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
		try {
			if (operation === 'create') {
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IProduct = {};
				if (additionalFields.assignedUserId !== undefined) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.productKey !== undefined) {
					body.product_key = additionalFields.productKey as string;
				}
				if (additionalFields.notes !== undefined) {
					body.notes = additionalFields.notes as string;
				}
				if (additionalFields.cost !== undefined) {
					body.cost = additionalFields.cost as number;
				}
				if (additionalFields.price !== undefined) {
					body.price = additionalFields.price as number;
				}
				if (additionalFields.quantity !== undefined) {
					body.quantity = additionalFields.quantity as number;
				}
				if (additionalFields.inStockQuantity !== undefined) {
					body.in_stock_quantity = additionalFields.inStockQuantity as number;
				}
				if (additionalFields.stockNotifications !== undefined) {
					body.stock_notification = additionalFields.stockNotifications as boolean;
				}
				if (additionalFields.stockNotificationsThreshold !== undefined) {
					body.stock_notification_threshold =
						additionalFields.stockNotificationsThreshold as number;
				}
				if (additionalFields.taxName1 !== undefined) {
					body.tax_name1 = additionalFields.taxName1 as string;
				}
				if (additionalFields.taxName2 !== undefined) {
					body.tax_name2 = additionalFields.taxName2 as string;
				}
				if (additionalFields.taxName3 !== undefined) {
					body.tax_name3 = additionalFields.taxName3 as string;
				}
				if (additionalFields.taxtRate1 !== undefined) {
					body.tax_rate1 = additionalFields.taxtRate1 as number;
				}
				if (additionalFields.taxtRate2 !== undefined) {
					body.tax_rate2 = additionalFields.taxtRate2 as number;
				}
				if (additionalFields.taxtRate3 !== undefined) {
					body.tax_rate3 = additionalFields.taxtRate3 as number;
				}
				if (additionalFields.customValue1 !== undefined) {
					body.custom_value1 = additionalFields.customValue1 as string;
				}
				if (additionalFields.customValue2 !== undefined) {
					body.custom_value2 = additionalFields.customValue2 as string;
				}
				if (additionalFields.customValue3 !== undefined) {
					body.custom_value3 = additionalFields.customValue3 as string;
				}
				if (additionalFields.customValue4 !== undefined) {
					body.custom_value4 = additionalFields.customValue4 as string;
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'POST',
					'/products',
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'update') {
				const productId = this.getNodeParameter('productId', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IProduct = {};
				if (additionalFields.assignedUserId !== undefined) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.productKey !== undefined) {
					body.product_key = additionalFields.productKey as string;
				}
				if (additionalFields.notes !== undefined) {
					body.notes = additionalFields.notes as string;
				}
				if (additionalFields.cost !== undefined) {
					body.cost = additionalFields.cost as number;
				}
				if (additionalFields.price !== undefined) {
					body.price = additionalFields.price as number;
				}
				if (additionalFields.quantity !== undefined) {
					body.quantity = additionalFields.quantity as number;
				}
				if (additionalFields.inStockQuantity !== undefined) {
					body.in_stock_quantity = additionalFields.inStockQuantity as number;
				}
				if (additionalFields.stockNotifications !== undefined) {
					body.stock_notification = additionalFields.stockNotifications as boolean;
				}
				if (additionalFields.stockNotificationsThreshold !== undefined) {
					body.stock_notification_threshold =
						additionalFields.stockNotificationsThreshold as number;
				}
				if (additionalFields.taxName1 !== undefined) {
					body.tax_name1 = additionalFields.taxName1 as string;
				}
				if (additionalFields.taxName2 !== undefined) {
					body.tax_name2 = additionalFields.taxName2 as string;
				}
				if (additionalFields.taxName3 !== undefined) {
					body.tax_name3 = additionalFields.taxName3 as string;
				}
				if (additionalFields.taxtRate1 !== undefined) {
					body.tax_rate1 = additionalFields.taxtRate1 as number;
				}
				if (additionalFields.taxtRate2 !== undefined) {
					body.tax_rate2 = additionalFields.taxtRate2 as number;
				}
				if (additionalFields.taxtRate3 !== undefined) {
					body.tax_rate3 = additionalFields.taxtRate3 as number;
				}
				if (additionalFields.customValue1 !== undefined) {
					body.custom_value1 = additionalFields.customValue1 as string;
				}
				if (additionalFields.customValue2 !== undefined) {
					body.custom_value2 = additionalFields.customValue2 as string;
				}
				if (additionalFields.customValue3 !== undefined) {
					body.custom_value3 = additionalFields.customValue3 as string;
				}
				if (additionalFields.customValue4 !== undefined) {
					body.custom_value4 = additionalFields.customValue4 as string;
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'PUT',
					`/products/${productId}`,
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'get') {
				const productId = this.getNodeParameter('productId', i) as string;
				const include = this.getNodeParameter('include', i) as string[];
				if (include.length) {
					qs.include = include.toString();
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'GET',
					`/products/${productId}`,
					{},
					qs,
				);
				responseData = responseData.data;
			}
			if (operation === 'getAll') {
				const filters = this.getNodeParameter('filters', i);
				if (filters.filter) {
					qs.filter = filters.filter as string;
				}
				if (filters.number) {
					qs.number = filters.number as string;
				}
				const include = this.getNodeParameter('include', i) as string[];
				if (include.length) {
					qs.include = include.toString();
				}
				const returnAll = this.getNodeParameter('returnAll', i);
				if (returnAll) {
					responseData = await invoiceNinjaApiRequestAllItems.call(
						this,
						'data',
						'GET',
						'/products',
						{},
						qs,
					);
				} else {
					const perPage = this.getNodeParameter('perPage', i) as number;
					if (perPage) qs.per_page = perPage;
					responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/products', {}, qs);
					responseData = responseData.data;
				}
			}
			if (operation === 'delete') {
				const productId = this.getNodeParameter('productId', i) as string;
				responseData = await invoiceNinjaApiRequest.call(this, 'DELETE', `/products/${productId}`);
				responseData = responseData.data;
			}
			if (operation === 'action') {
				const productId = this.getNodeParameter('productId', i) as string;
				const action = this.getNodeParameter('action', i) as string;
				responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/products/bulk', {
					action,
					ids: [productId],
				});
				responseData = responseData.data[0];
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				const executionErrorData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionErrorData);
				continue;
			}
			throw error;
		}
	}

	return this.prepareOutputData(returnData);
};
