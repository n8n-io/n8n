import moment from 'moment';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import {
	invoiceNinjaApiDownloadFile,
	invoiceNinjaApiRequest,
	invoiceNinjaApiRequestAllItems,
} from '../GenericFunctions';
import type { IRecurringInvoice, IRecurringInvoiceItem } from './RecurringInvoiceInterface';

export const execute = async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;
	const qs: IDataObject = {};

	let responseData;

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	if (resource !== 'recurringInvoice') throw new Error('Invalid Resource Execution Handler');

	for (let i = 0; i < length; i++) {
		//Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
		try {
			if (operation === 'create') {
				const clientId = this.getNodeParameter('clientId', i);
				const frequencyId = this.getNodeParameter('frequencyId', i);
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IRecurringInvoice = {};
				body.client_id = clientId as string;
				body.frequency_id = frequencyId as string;
				if (additionalFields.projectId !== undefined) {
					body.project_id = additionalFields.projectId as string;
				}
				if (additionalFields.assignedUserId !== undefined) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.vendorId !== undefined) {
					body.vendor_id = additionalFields.vendorId as string;
				}
				if (additionalFields.designId !== undefined) {
					body.design_id = additionalFields.designId as string;
				}
				if (additionalFields.number !== undefined) {
					body.number = additionalFields.number as string;
				}
				if (additionalFields.discount !== undefined) {
					body.discount = additionalFields.discount as number;
				}
				if (additionalFields.poNumber !== undefined) {
					body.po_number = additionalFields.poNumber as string;
				}
				if (additionalFields.dueDate !== undefined) {
					body.due_date = moment(additionalFields.dueDate as string).format('YYYY-MM-DD');
				}
				if (additionalFields.terms !== undefined) {
					body.terms = additionalFields.terms as string;
				}
				if (additionalFields.footer !== undefined) {
					body.footer = additionalFields.footer as string;
				}
				if (additionalFields.usesInclusiveTaxes !== undefined) {
					body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
				}
				if (additionalFields.isAmountDiscount !== undefined) {
					body.is_amount_discount = additionalFields.isAmountDiscount as boolean;
				}
				if (additionalFields.partial !== undefined) {
					body.partial = additionalFields.partial as number;
				}
				if (additionalFields.date !== undefined) {
					body.date = moment(additionalFields.date as string).format('YYYY-MM-DD');
				}
				if (additionalFields.partialDueDate !== undefined) {
					body.partial_due_date = moment(additionalFields.partialDueDate as string).format(
						'YYYY-MM-DD',
					);
				}
				if (additionalFields.poNumber !== undefined) {
					body.po_number = additionalFields.poNumber as string;
				}
				if (additionalFields.discount !== undefined) {
					body.discount = additionalFields.discount as number;
				}
				if (additionalFields.privateNotes !== undefined) {
					body.private_notes = additionalFields.privateNotes as string;
				}
				if (additionalFields.publicNotes !== undefined) {
					body.public_notes = additionalFields.publicNotes as string;
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
				if (additionalFields.taxRate1 !== undefined) {
					body.tax_rate1 = additionalFields.taxtRate1 as number;
				}
				if (additionalFields.taxRate2 !== undefined) {
					body.tax_rate2 = additionalFields.taxtRate2 as number;
				}
				if (additionalFields.taxRate3 !== undefined) {
					body.tax_rate3 = additionalFields.taxtRate3 as number;
				}
				if (additionalFields.remainingCycles !== undefined) {
					body.remaining_cycles = additionalFields.remainingCycles as number;
				}
				if (additionalFields.nextSendDate !== undefined) {
					body.next_send_date = moment(additionalFields.nextSendDate as string).format(
						'YYYY-MM-DD HH:mm:ss',
					);
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
				if (additionalFields.autoBillEnabled !== undefined) {
					body.auto_bill_enabled = additionalFields.autoBillEnabled as boolean;
				}
				const lineItemsValues = (this.getNodeParameter('recurringInvoiceItemsUi', i) as IDataObject)
					.recurringInvoiceItemsValues as IDataObject[];
				if (lineItemsValues) {
					const recurringInvoiceItems: IRecurringInvoiceItem[] = [];
					for (const itemValue of lineItemsValues) {
						const item: IRecurringInvoiceItem = {
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
						recurringInvoiceItems.push(item);
					}
					body.line_items = recurringInvoiceItems;
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'POST',
					'/recurring_invoices',
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'update') {
				const recurringInvoiceId = this.getNodeParameter('recurringInvoiceId', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IRecurringInvoice = {};
				if (additionalFields.projectId !== undefined) {
					body.project_id = additionalFields.projectId as string;
				}
				if (additionalFields.assignedUserId !== undefined) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.clientId !== undefined) {
					body.client_id = additionalFields.clientId as string;
				}
				if (additionalFields.vendorId !== undefined) {
					body.vendor_id = additionalFields.vendorId as string;
				}
				if (additionalFields.designId !== undefined) {
					body.design_id = additionalFields.designId as string;
				}
				if (additionalFields.number !== undefined) {
					body.number = additionalFields.number as string;
				}
				if (additionalFields.discount !== undefined) {
					body.discount = additionalFields.discount as number;
				}
				if (additionalFields.poNumber !== undefined) {
					body.po_number = additionalFields.poNumber as string;
				}
				if (additionalFields.date !== undefined) {
					body.date = moment(additionalFields.date as string).format('YYYY-MM-DD');
				}
				if (additionalFields.dueDate !== undefined) {
					body.due_date = moment(additionalFields.dueDate as string).format('YYYY-MM-DD');
				}
				if (additionalFields.terms !== undefined) {
					body.terms = additionalFields.terms as string;
				}
				if (additionalFields.usesInclusiveTaxes !== undefined) {
					body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
				}
				if (additionalFields.isAmountDiscount !== undefined) {
					body.is_amount_discount = additionalFields.isAmountDiscount as boolean;
				}
				if (additionalFields.partial !== undefined) {
					body.partial = additionalFields.partial as number;
				}
				if (additionalFields.partialDueDate !== undefined) {
					body.partial_due_date = moment(additionalFields.partialDueDate as string).format(
						'YYYY-MM-DD',
					);
				}
				if (additionalFields.poNumber !== undefined) {
					body.po_number = additionalFields.poNumber as string;
				}
				if (additionalFields.discount !== undefined) {
					body.discount = additionalFields.discount as number;
				}
				if (additionalFields.privateNotes !== undefined) {
					body.private_notes = additionalFields.privateNotes as string;
				}
				if (additionalFields.publicNotes !== undefined) {
					body.public_notes = additionalFields.publicNotes as string;
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
				if (additionalFields.taxRate1 !== undefined) {
					body.tax_rate1 = additionalFields.taxtRate1 as number;
				}
				if (additionalFields.taxRate2 !== undefined) {
					body.tax_rate2 = additionalFields.taxtRate2 as number;
				}
				if (additionalFields.taxRate3 !== undefined) {
					body.tax_rate3 = additionalFields.taxtRate3 as number;
				}
				if (additionalFields.remainingCycles !== undefined) {
					body.remaining_cycles = additionalFields.remainingCycles as number;
				}
				if (additionalFields.frequencyId !== undefined) {
					body.frequency_id = additionalFields.frequencyId as string;
				}
				if (additionalFields.nextSendDate !== undefined) {
					body.next_send_date = moment(additionalFields.nextSendDate as string).format(
						'YYYY-MM-DD HH:mm:ss',
					);
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
				if (additionalFields.autoBillEnabled !== undefined) {
					body.auto_bill_enabled = additionalFields.autoBillEnabled as boolean;
				}
				const lineItemsValues = (this.getNodeParameter('recurringInvoiceItemsUi', i) as IDataObject)
					.recurringInvoiceItemsValues as IDataObject[];
				if (lineItemsValues) {
					const recurringInvoiceItems: IRecurringInvoiceItem[] = [];
					for (const itemValue of lineItemsValues) {
						const item: IRecurringInvoiceItem = {
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
						recurringInvoiceItems.push(item);
					}
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'PUT',
					`/recurring_invoices/${recurringInvoiceId}`,
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'get') {
				const recurringInvoiceId = this.getNodeParameter('recurringInvoiceId', i) as string;
				const include = this.getNodeParameter('include', i) as string[];
				if (include.length) {
					qs.include = include.toString();
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'GET',
					`/recurring_invoices/${recurringInvoiceId}`,
					{},
					qs,
				);
				responseData = responseData.data;
				const download = this.getNodeParameter('download', i);
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
									`/recurring_invoice/${responseData.invitations[0].key}/download`,
								)) as Buffer,
								'recurring_invoice.pdf',
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
				if (filters.withoutDeletedClients !== undefined) {
					qs.without_deleted_clients = filters.withoutDeletedClients as boolean;
				}
				if (filters.upcomming !== undefined) {
					qs.upcomming = filters.upcomming as boolean;
				}
				if (filters.overdue !== undefined) {
					qs.overdue = filters.overdue as boolean;
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
						'/recurring_invoices',
						{},
						qs,
					);
				} else {
					const perPage = this.getNodeParameter('perPage', i) as number;
					if (perPage) qs.per_page = perPage;
					responseData = await invoiceNinjaApiRequest.call(
						this,
						'GET',
						'/recurring_invoices',
						{},
						qs,
					);
					responseData = responseData.data;
				}
			}
			if (operation === 'delete') {
				const recurringInvoiceId = this.getNodeParameter('recurringInvoiceId', i) as string;
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'DELETE',
					`/recurring_invoices/${recurringInvoiceId}`,
				);
				responseData = responseData.data;
			}
			if (operation === 'action') {
				const recurringInvoiceId = this.getNodeParameter('recurringInvoiceId', i) as string;
				const action = this.getNodeParameter('action', i) as string;
				responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/recurring_invoices/bulk', {
					action,
					ids: [recurringInvoiceId],
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
