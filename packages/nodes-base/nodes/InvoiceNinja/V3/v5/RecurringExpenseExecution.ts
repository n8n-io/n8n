import moment from 'moment';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';
import type { IRecurringExpense } from './RecurringExpenseInterface';

export const execute = async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;
	const qs: IDataObject = {};

	let responseData;

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	if (resource !== 'recurringExpense') throw new Error('Invalid Resource Execution Handler');

	for (let i = 0; i < length; i++) {
		//Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
		try {
			if (operation === 'create') {
				const frequencyId = this.getNodeParameter('frequencyId', i);
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IRecurringExpense = {};
				body.frequency_id = frequencyId as string;
				if (additionalFields.assignedUserId !== undefined) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.vendorId !== undefined) {
					body.vendor_id = additionalFields.vendorId as string;
				}
				if (additionalFields.invoiceId !== undefined) {
					body.invoice_id = additionalFields.invoiceId as string;
				}
				if (additionalFields.clientId !== undefined) {
					body.client_id = additionalFields.clientId as string;
				}
				if (additionalFields.bankId !== undefined) {
					body.bank_id = additionalFields.bankId as string;
				}
				if (additionalFields.currencyId !== undefined) {
					body.currency_id = additionalFields.currencyId as string;
				}
				if (additionalFields.categoryId !== undefined) {
					body.category_id = additionalFields.categoryId as string;
				}
				if (additionalFields.paymentTypeId !== undefined) {
					body.payment_type_id = additionalFields.paymentTypeId as string;
				}
				if (additionalFields.shouldBeInvoiced !== undefined) {
					body.should_be_invoiced = additionalFields.shouldBeInvoiced as boolean;
				}
				if (additionalFields.amount !== undefined) {
					body.amount = additionalFields.amount as number;
				}
				if (additionalFields.foreignAmount !== undefined) {
					body.foreign_amount = additionalFields.foreignAmount as number;
				}
				if (additionalFields.exchangeRate !== undefined) {
					body.exchange_rate = additionalFields.exchangeRate as number;
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
					body.tax_rate1 = additionalFields.taxRate1 as number;
				}
				if (additionalFields.taxRate2 !== undefined) {
					body.tax_rate2 = additionalFields.taxRate2 as number;
				}
				if (additionalFields.taxRate3 !== undefined) {
					body.tax_rate3 = additionalFields.taxRate3 as number;
				}
				if (additionalFields.taxAmount1 !== undefined) {
					body.tax_amount1 = additionalFields.taxAmount1 as number;
				}
				if (additionalFields.taxAmount2 !== undefined) {
					body.tax_amount2 = additionalFields.taxAmount2 as number;
				}
				if (additionalFields.taxAmount3 !== undefined) {
					body.tax_amount3 = additionalFields.taxAmount3 as number;
				}
				if (additionalFields.remainingCycles !== undefined) {
					body.remaining_cycles = additionalFields.remainingCycles as number;
				}
				if (additionalFields.nextSendDate !== undefined) {
					body.next_send_date = moment(additionalFields.nextSendDate as string).format("YYYY-MM-DD HH:mm:ss");
				}
				if (additionalFields.taxAmount3 !== undefined) {
					body.tax_amount3 = additionalFields.taxAmount3 as number;
				}
				if (additionalFields.publicNotes !== undefined) {
					body.public_notes = additionalFields.publicNotes as string;
				}
				if (additionalFields.privateNotes !== undefined) {
					body.private_notes = additionalFields.privateNotes as string;
				}
				if (additionalFields.transactionReference !== undefined) {
					body.transaction_reference = additionalFields.transactionReference as string;
				}
				if (additionalFields.transactionId !== undefined) {
					body.transaction_id = additionalFields.transactionId as string;
				}
				if (additionalFields.date !== undefined) {
					body.date = moment(additionalFields.date as string).format("YYYY-MM-DD");
				}
				if (additionalFields.paymentDate !== undefined) {
					body.payment_date = moment(additionalFields.paymentDate as string).format("YYYY-MM-DD");
				}
				if (additionalFields.number !== undefined) {
					body.number = additionalFields.number as string;
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
				if (additionalFields.projectId !== undefined) {
					body.project_id = additionalFields.projectId as string;
				}
				if (additionalFields.usesInclusiveTaxes !== undefined) {
					body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
				}
				if (additionalFields.calculateTaxByAmount !== undefined) {
					body.calculate_tax_by_amount = additionalFields.calculateTaxByAmount as boolean;
				}
				console.log(body)
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'POST',
					'/recurring_expenses',
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'update') {
				const recurringExpenseId = this.getNodeParameter('recurringExpenseId', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IRecurringExpense = {};
				if (additionalFields.assignedUserId !== undefined) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.vendorId !== undefined) {
					body.vendor_id = additionalFields.vendorId as string;
				}
				if (additionalFields.invoiceId !== undefined) {
					body.invoice_id = additionalFields.invoiceId as string;
				}
				if (additionalFields.clientId !== undefined) {
					body.client_id = additionalFields.clientId as string;
				}
				if (additionalFields.bankId !== undefined) {
					body.bank_id = additionalFields.bankId as string;
				}
				if (additionalFields.currencyId !== undefined) {
					body.currency_id = additionalFields.currencyId as string;
				}
				if (additionalFields.categoryId !== undefined) {
					body.category_id = additionalFields.categoryId as string;
				}
				if (additionalFields.paymentTypeId !== undefined) {
					body.payment_type_id = additionalFields.paymentTypeId as string;
				}
				if (additionalFields.shouldBeInvoiced !== undefined) {
					body.should_be_invoiced = additionalFields.shouldBeInvoiced as boolean;
				}
				if (additionalFields.amount !== undefined) {
					body.amount = additionalFields.amount as number;
				}
				if (additionalFields.foreignAmount !== undefined) {
					body.foreign_amount = additionalFields.foreignAmount as number;
				}
				if (additionalFields.exchangeRate !== undefined) {
					body.exchange_rate = additionalFields.exchangeRate as number;
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
					body.tax_rate1 = additionalFields.taxRate1 as number;
				}
				if (additionalFields.taxRate2 !== undefined) {
					body.tax_rate2 = additionalFields.taxRate2 as number;
				}
				if (additionalFields.taxRate3 !== undefined) {
					body.tax_rate3 = additionalFields.taxRate3 as number;
				}
				if (additionalFields.taxAmount1 !== undefined) {
					body.tax_amount1 = additionalFields.taxAmount1 as number;
				}
				if (additionalFields.taxAmount2 !== undefined) {
					body.tax_amount2 = additionalFields.taxAmount2 as number;
				}
				if (additionalFields.taxAmount3 !== undefined) {
					body.tax_amount3 = additionalFields.taxAmount3 as number;
				}
				if (additionalFields.remainingCycles !== undefined) {
					body.remaining_cycles = additionalFields.remainingCycles as number;
				}
				if (additionalFields.frequencyId !== undefined) {
					body.frequency_id = additionalFields.frequencyId as string;
				}
				if (additionalFields.nextSendDate !== undefined) {
					body.next_send_date = moment(additionalFields.nextSendDate as string).format("YYYY-MM-DD HH:mm:ss");
				}
				if (additionalFields.publicNotes !== undefined) {
					body.public_notes = additionalFields.publicNotes as string;
				}
				if (additionalFields.privateNotes !== undefined) {
					body.private_notes = additionalFields.privateNotes as string;
				}
				if (additionalFields.transactionReference !== undefined) {
					body.transaction_reference = additionalFields.transactionReference as string;
				}
				if (additionalFields.transactionId !== undefined) {
					body.transaction_id = additionalFields.transactionId as string;
				}
				if (additionalFields.date !== undefined) {
					body.date = moment(additionalFields.date as string).format("YYYY-MM-DD");
				}
				if (additionalFields.paymentDate !== undefined) {
					body.payment_date = moment(additionalFields.paymentDate as string).format("YYYY-MM-DD");
				}
				if (additionalFields.number !== undefined) {
					body.number = additionalFields.number as string;
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
				if (additionalFields.projectId !== undefined) {
					body.project_id = additionalFields.projectId as string;
				}
				if (additionalFields.usesInclusiveTaxes !== undefined) {
					body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
				}
				if (additionalFields.calculateTaxByAmount !== undefined) {
					body.calculate_tax_by_amount = additionalFields.calculateTaxByAmount as boolean;
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'PUT',
					`/recurring_expenses/${recurringExpenseId}`,
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'get') {
				const recurringExpenseId = this.getNodeParameter('recurringExpenseId', i) as string;
				const include = this.getNodeParameter('include', i) as string[];
				if (include.length) {
					qs.include = include.toString();
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'GET',
					`/recurring_expenses/${recurringExpenseId}`,
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
				if (filters.clientId) {
					qs.client_id = filters.clientId as string;
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
						'/recurring_expenses',
						{},
						qs,
					);
				} else {
					const perPage = this.getNodeParameter('perPage', i) as number;
					if (perPage) qs.per_page = perPage;
					responseData = await invoiceNinjaApiRequest.call(
						this,
						'GET',
						'/recurringExpenses',
						{},
						qs,
					);
					responseData = responseData.data;
				}
			}
			if (operation === 'delete') {
				const recurringExpenseId = this.getNodeParameter('recurringExpenseId', i) as string;
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'DELETE',
					`/recurring_expenses/${recurringExpenseId}`,
				);
				responseData = responseData.data;
			}
			if (operation === 'action') {
				const recurringExpenseId = this.getNodeParameter('recurringExpenseId', i) as string;
				const action = this.getNodeParameter('action', i) as string;
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'POST',
					`/recurring_expense/bulk`,
					{
						action,
						ids: [recurringExpenseId]
					}
				);
				responseData = responseData.data[0];
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
