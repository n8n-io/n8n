import moment from 'moment';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { invoiceNinjaApiDownloadFile, invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';
import type { IPurchaseOrder, IPurchaseOrderItem } from './PurchaseOrderInterface';

export const execute = async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;
	const qs: IDataObject = {};

	let responseData;

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	if (resource !== 'purchaseOrder') throw new Error('Invalid Resource Execution Handler');

	for (let i = 0; i < length; i++) {
		//Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
		try {
			if (operation === 'create') {
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IPurchaseOrder = {};
				if (additionalFields.assignedUserId) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.projectId) {
					body.project_id = additionalFields.projectId as string;
				}
				if (additionalFields.amount) {
					body.amount = additionalFields.amount as number;
				}
				if (additionalFields.balance) {
					body.balance = additionalFields.balance as number;
				}
				if (additionalFields.clientId) {
					body.client_id = additionalFields.clientId as string;
				}
				if (additionalFields.statusId) {
					body.status_id = additionalFields.statusId as string;
				}
				if (additionalFields.designId) {
					body.design_id = additionalFields.designId as string;
				}
				if (additionalFields.number) {
					body.number = additionalFields.number as string;
				}
				if (additionalFields.discount) {
					body.discount = additionalFields.discount as number;
				}
				if (additionalFields.poNumber) {
					body.po_number = additionalFields.poNumber as string;
				}
				if (additionalFields.date) {
					body.date = moment(additionalFields.date as string).format("YYYY-MM-DD");
				}
				if (additionalFields.dueDate) {
					body.due_date = moment(additionalFields.dueDate as string).format("YYYY-MM-DD");
				}
				if (additionalFields.terms) {
					body.terms = additionalFields.terms as string;
				}
				if (additionalFields.usesInclusiveTaxes) {
					body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
				}
				if (additionalFields.taxName1) {
					body.tax_name1 = additionalFields.taxName1 as string;
				}
				if (additionalFields.taxName2) {
					body.tax_name2 = additionalFields.taxName2 as string;
				}
				if (additionalFields.taxName3) {
					body.tax_name3 = additionalFields.taxName3 as string;
				}
				if (additionalFields.taxRate1) {
					body.tax_rate1 = additionalFields.taxtRate1 as number;
				}
				if (additionalFields.taxRate2) {
					body.tax_rate2 = additionalFields.taxtRate2 as number;
				}
				if (additionalFields.taxRate3) {
					body.tax_rate3 = additionalFields.taxtRate3 as number;
				}
				if (additionalFields.isAmountDiscount) {
					body.is_amount_discount = additionalFields.isAmountDiscount as boolean;
				}
				if (additionalFields.footer) {
					body.footer = additionalFields.footer as string;
				}
				if (additionalFields.partial) {
					body.partial = additionalFields.partial as number;
				}
				if (additionalFields.partialDueDate) {
					body.partial_due_date = moment(additionalFields.partialDueDate as string).format("YYYY-MM-DD");
				}
				if (additionalFields.entityType) {
					body.entity_type = additionalFields.entityType as string;
				}
				if (additionalFields.exchangeRate) {
					body.exchange_rate = additionalFields.exchangeRate as number;
				}
				if (additionalFields.paidToDate) {
					body.paid_to_date = additionalFields.paidToDate as number;
				}
				if (additionalFields.subscriptionId) {
					body.subscription_id = additionalFields.subscriptionId as string;
				}
				if (additionalFields.expenseId) {
					body.expense_id = additionalFields.expenseId as string;
				}
				if (additionalFields.publicNotes) {
					body.public_notes = additionalFields.publicNotes as string;
				}
				if (additionalFields.privateNotes) {
					body.private_notes = additionalFields.privateNotes as string;
				}
				if (additionalFields.customValue1) {
					body.custom_value1 = additionalFields.customValue1 as string;
				}
				if (additionalFields.customValue2) {
					body.custom_value2 = additionalFields.customValue2 as string;
				}
				if (additionalFields.customValue3) {
					body.custom_value3 = additionalFields.customValue3 as string;
				}
				if (additionalFields.customValue4) {
					body.custom_value4 = additionalFields.customValue4 as string;
				}
				const lineItemsValues = (this.getNodeParameter('invoiceItemsUi', i) as IDataObject)
					.invoiceItemsValues as IDataObject[];
				if (lineItemsValues) {
					const lineItems: IPurchaseOrderItem[] = [];
					for (const itemValue of lineItemsValues) {
						const item: IPurchaseOrderItem = {
							quantity: itemValue.quantity as number,
							cost: itemValue.cost as number,
							product_key: itemValue.service as string,
							notes: itemValue.description as string,
							discount: itemValue.discount as number,
							tax_rate1: itemValue.taxRate1 as number,
							tax_rate2: itemValue.taxRate2 as number,
							tax_rate3: itemValue.taxRate3 as number,
							tax_name1: itemValue.taxName1 as string,
							tax_name2: itemValue.taxName2 as string,
							tax_name3: itemValue.taxName3 as string,
							custom_value1: itemValue.customValue1 as string,
							custom_value2: itemValue.customValue2 as string,
							custom_value3: itemValue.customValue3 as string,
							custom_value4: itemValue.customValue4 as string,
						};
						lineItems.push(item);
					}
					body.line_items = lineItems;
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'POST',
					'/purchase_orders',
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'update') {
				const purchaseOrderId = this.getNodeParameter('purchaseOrderId', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IPurchaseOrder = {};
				if (additionalFields.assignedUserId) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.projectId) {
					body.project_id = additionalFields.projectId as string;
				}
				if (additionalFields.amount) {
					body.amount = additionalFields.amount as number;
				}
				if (additionalFields.balance) {
					body.balance = additionalFields.balance as number;
				}
				if (additionalFields.clientId) {
					body.client_id = additionalFields.clientId as string;
				}
				if (additionalFields.statusId) {
					body.status_id = additionalFields.statusId as string;
				}
				if (additionalFields.designId) {
					body.design_id = additionalFields.designId as string;
				}
				if (additionalFields.number) {
					body.number = additionalFields.number as string;
				}
				if (additionalFields.discount) {
					body.discount = additionalFields.discount as number;
				}
				if (additionalFields.poNumber) {
					body.po_number = additionalFields.poNumber as string;
				}
				if (additionalFields.date) {
					body.date = moment(additionalFields.date as string).format("YYYY-MM-DD");
				}
				if (additionalFields.dueDate) {
					body.due_date = moment(additionalFields.dueDate as string).format("YYYY-MM-DD");
				}
				if (additionalFields.terms) {
					body.terms = additionalFields.terms as string;
				}
				if (additionalFields.usesInclusiveTaxes) {
					body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
				}
				if (additionalFields.taxName1) {
					body.tax_name1 = additionalFields.taxName1 as string;
				}
				if (additionalFields.taxName2) {
					body.tax_name2 = additionalFields.taxName2 as string;
				}
				if (additionalFields.taxName3) {
					body.tax_name3 = additionalFields.taxName3 as string;
				}
				if (additionalFields.taxRate1) {
					body.tax_rate1 = additionalFields.taxtRate1 as number;
				}
				if (additionalFields.taxRate2) {
					body.tax_rate2 = additionalFields.taxtRate2 as number;
				}
				if (additionalFields.taxRate3) {
					body.tax_rate3 = additionalFields.taxtRate3 as number;
				}
				if (additionalFields.isAmountDiscount) {
					body.is_amount_discount = additionalFields.isAmountDiscount as boolean;
				}
				if (additionalFields.footer) {
					body.footer = additionalFields.footer as string;
				}
				if (additionalFields.partial) {
					body.partial = additionalFields.partial as number;
				}
				if (additionalFields.partialDueDate) {
					body.partial_due_date = moment(additionalFields.partialDueDate as string).format("YYYY-MM-DD");
				}
				if (additionalFields.entityType) {
					body.entity_type = additionalFields.entityType as string;
				}
				if (additionalFields.exchangeRate) {
					body.exchange_rate = additionalFields.exchangeRate as number;
				}
				if (additionalFields.paidToDate) {
					body.paid_to_date = additionalFields.paidToDate as number;
				}
				if (additionalFields.subscriptionId) {
					body.subscription_id = additionalFields.subscriptionId as string;
				}
				if (additionalFields.expenseId) {
					body.expense_id = additionalFields.expenseId as string;
				}
				if (additionalFields.publicNotes) {
					body.public_notes = additionalFields.publicNotes as string;
				}
				if (additionalFields.privateNotes) {
					body.private_notes = additionalFields.privateNotes as string;
				}
				if (additionalFields.customValue1) {
					body.custom_value1 = additionalFields.customValue1 as string;
				}
				if (additionalFields.customValue2) {
					body.custom_value2 = additionalFields.customValue2 as string;
				}
				if (additionalFields.customValue3) {
					body.custom_value3 = additionalFields.customValue3 as string;
				}
				if (additionalFields.customValue4) {
					body.custom_value4 = additionalFields.customValue4 as string;
				}
				const lineItemsValues = (this.getNodeParameter('invoiceItemsUi', i) as IDataObject)
					.invoiceItemsValues as IDataObject[];
				if (lineItemsValues) {
					const lineItems: IPurchaseOrderItem[] = [];
					for (const itemValue of lineItemsValues) {
						const item: IPurchaseOrderItem = {
							quantity: itemValue.quantity as number,
							cost: itemValue.cost as number,
							product_key: itemValue.service as string,
							notes: itemValue.description as string,
							discount: itemValue.discount as number,
							tax_rate1: itemValue.taxRate1 as number,
							tax_rate2: itemValue.taxRate2 as number,
							tax_rate3: itemValue.taxRate3 as number,
							tax_name1: itemValue.taxName1 as string,
							tax_name2: itemValue.taxName2 as string,
							tax_name3: itemValue.taxName3 as string,
							custom_value1: itemValue.customValue1 as string,
							custom_value2: itemValue.customValue2 as string,
							custom_value3: itemValue.customValue3 as string,
							custom_value4: itemValue.customValue4 as string,
						};
						lineItems.push(item);
					}
					body.line_items = lineItems;
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'PUT',
					`/purchase_orders/${purchaseOrderId}`,
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'get') {
				const purchaseOrderId = this.getNodeParameter('purchaseOrderId', i) as string;
				const include = this.getNodeParameter('include', i) as string[];
				if (include.length) {
					qs.include = include.toString();
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'GET',
					`/purchase_orders/${purchaseOrderId}`,
					{},
					qs,
				);
				responseData = responseData.data;
				const download = this.getNodeParameter('download', i) as boolean;
				if (download) {
					if (!responseData.invitations[0].key)
						throw new Error('Download failed - No invitation key present');
					// download it with the fetched key
					returnData.push({
						json: responseData,
						binary: {
							data: await this.helpers.prepareBinaryData(
								(await invoiceNinjaApiDownloadFile.call(
									this,
									'GET',
									`/purchase_order/${responseData.invitations[0].key}/download`,
								)),
								'purchase_order.pdf',
								'application/pdf',
							),
						},
					});
					continue;
				}
			}
			if (operation === 'getAll') {
				const filters = this.getNodeParameter('filters', i);
				if (filters.filter) {
					qs.filter = filters.filter as string;
				}
				if (filters.number) {
					qs.number = filters.number as string;
				}
				if (filters.clientStatus) {
					qs.client_status = filters.clientStatus.toString();
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
						'/purchase_orders',
						{},
						qs,
					);
				} else {
					const perPage = this.getNodeParameter('perPage', i) as boolean;
					if (perPage) qs.per_page = perPage;
					responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/purchase_orders', {}, qs);
					responseData = responseData.data;
				}
			}
			if (operation === 'delete') {
				const purchaseOrderId = this.getNodeParameter('purchaseOrderId', i) as string;
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'DELETE',
					`/purchase_orders/${purchaseOrderId}`,
				);
				responseData = responseData.data;
			}
			if (operation === 'action') {
				const purchaseOrderId = this.getNodeParameter('purchaseOrderId', i) as string;
				const action = this.getNodeParameter('action', i) as string;
				if (action === 'custom_email') {
					const customEmailBody = this.getNodeParameter('customEmailBody', i) as string;
					const customEmailSubject = this.getNodeParameter('customEmailSubject', i) as string;
					const customEmailTemplate = this.getNodeParameter('customEmailTemplate', i) as string;
					responseData = await invoiceNinjaApiRequest.call(
						this,
						'POST',
						`/emails`,
						{
							body: customEmailBody,
							entity: "purchase_order",
							entity_id: purchaseOrderId,
							subject: customEmailSubject,
							template: customEmailTemplate,
						}
					);
					responseData = responseData.data;
				} else {
					responseData = await invoiceNinjaApiRequest.call(
						this,
						'POST',
						`/purchase_orders/bulk`,
						{
							action,
							ids: [purchaseOrderId]
						}
					);
					responseData = responseData.data[0];
				}
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
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
