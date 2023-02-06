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
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IRecurringExpense = {};
				if (additionalFields.assignedUserId) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.vendorId) {
					body.vendor_id = additionalFields.vendorId as string;
				}
				if (additionalFields.invoiceId) {
					body.invoice_id = additionalFields.invoiceId as string;
				}
				if (additionalFields.clientId) {
					body.client_id = additionalFields.clientId as string;
				}
				if (additionalFields.bankId) {
					body.bank_id = additionalFields.bankId as string;
				}
				if (additionalFields.currencyId) {
					body.currency_id = additionalFields.currencyId as string;
				}
				if (additionalFields.categoryId) {
					body.category_id = additionalFields.categoryId as string;
				}
				if (additionalFields.paymentTypeId) {
					body.payment_type_id = additionalFields.paymentTypeId as string;
				}
				if (additionalFields.shouldBeInvoiced) {
					body.should_be_invoiced = additionalFields.shouldBeInvoiced as boolean;
				}
				if (additionalFields.amount) {
					body.amount = additionalFields.amount as number;
				}
				if (additionalFields.foreignAmount) {
					body.foreign_amount = additionalFields.foreignAmount as number;
				}
				if (additionalFields.exchangeRate) {
					body.exchange_rate = additionalFields.exchangeRate as number;
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
					body.tax_rate1 = additionalFields.taxRate1 as number;
				}
				if (additionalFields.taxRate2) {
					body.tax_rate2 = additionalFields.taxRate2 as number;
				}
				if (additionalFields.taxRate3) {
					body.tax_rate3 = additionalFields.taxRate3 as number;
				}
				if (additionalFields.taxAmount1) {
					body.tax_amount1 = additionalFields.taxAmount1 as number;
				}
				if (additionalFields.taxAmount2) {
					body.tax_amount2 = additionalFields.taxAmount2 as number;
				}
				if (additionalFields.taxAmount3) {
					body.tax_amount3 = additionalFields.taxAmount3 as number;
				}
				if (additionalFields.remainingCycles) {
					body.remaining_cycles = additionalFields.remainingCycles as number;
				}
				if (additionalFields.frequencyId) {
					body.frequency_id = additionalFields.frequencyId as string;
				}
				if (additionalFields.nextSendDate) {
					body.next_send_date = additionalFields.nextSendDate as string;
				}
				if (additionalFields.taxAmount3) {
					body.tax_amount3 = additionalFields.taxAmount3 as number;
				}
				if (additionalFields.publicNotes) {
					body.public_notes = additionalFields.publicNotes as string;
				}
				if (additionalFields.privateNotes) {
					body.private_notes = additionalFields.privateNotes as string;
				}
				if (additionalFields.transactionReference) {
					body.transaction_reference = additionalFields.transactionReference as string;
				}
				if (additionalFields.transactionId) {
					body.transaction_id = additionalFields.transactionId as string;
				}
				if (additionalFields.date) {
					body.date = additionalFields.date as string;
				}
				if (additionalFields.number) {
					body.number = additionalFields.number as string;
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
				if (additionalFields.projectId) {
					body.project_id = additionalFields.projectId as string;
				}
				if (additionalFields.usesInclusiveTaxes) {
					body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
				}
				if (additionalFields.calculateTaxByAmount) {
					body.calculate_tax_by_amount = additionalFields.calculateTaxByAmount as boolean;
				}
				if (additionalFields.entityType) {
					body.entity_type = additionalFields.entityType as string;
				}
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

				if (additionalFields.assignedUserId) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.vendorId) {
					body.vendor_id = additionalFields.vendorId as string;
				}
				if (additionalFields.invoiceId) {
					body.invoice_id = additionalFields.invoiceId as string;
				}
				if (additionalFields.clientId) {
					body.client_id = additionalFields.clientId as string;
				}
				if (additionalFields.bankId) {
					body.bank_id = additionalFields.bankId as string;
				}
				if (additionalFields.currencyId) {
					body.currency_id = additionalFields.currencyId as string;
				}
				if (additionalFields.categoryId) {
					body.category_id = additionalFields.categoryId as string;
				}
				if (additionalFields.paymentTypeId) {
					body.payment_type_id = additionalFields.paymentTypeId as string;
				}
				if (additionalFields.shouldBeInvoiced) {
					body.should_be_invoiced = additionalFields.shouldBeInvoiced as boolean;
				}
				if (additionalFields.amount) {
					body.amount = additionalFields.amount as number;
				}
				if (additionalFields.foreignAmount) {
					body.foreign_amount = additionalFields.foreignAmount as number;
				}
				if (additionalFields.exchangeRate) {
					body.exchange_rate = additionalFields.exchangeRate as number;
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
					body.tax_rate1 = additionalFields.taxRate1 as number;
				}
				if (additionalFields.taxRate2) {
					body.tax_rate2 = additionalFields.taxRate2 as number;
				}
				if (additionalFields.taxRate3) {
					body.tax_rate3 = additionalFields.taxRate3 as number;
				}
				if (additionalFields.taxAmount1) {
					body.tax_amount1 = additionalFields.taxAmount1 as number;
				}
				if (additionalFields.taxAmount2) {
					body.tax_amount2 = additionalFields.taxAmount2 as number;
				}
				if (additionalFields.taxAmount3) {
					body.tax_amount3 = additionalFields.taxAmount3 as number;
				}
				if (additionalFields.remainingCycles) {
					body.remaining_cycles = additionalFields.remainingCycles as number;
				}
				if (additionalFields.frequencyId) {
					body.frequency_id = additionalFields.frequencyId as string;
				}
				if (additionalFields.nextSendDate) {
					body.next_send_date = additionalFields.nextSendDate as string;
				}
				if (additionalFields.publicNotes) {
					body.public_notes = additionalFields.publicNotes as string;
				}
				if (additionalFields.privateNotes) {
					body.private_notes = additionalFields.privateNotes as string;
				}
				if (additionalFields.transactionReference) {
					body.transaction_reference = additionalFields.transactionReference as string;
				}
				if (additionalFields.transactionId) {
					body.transaction_id = additionalFields.transactionId as string;
				}
				if (additionalFields.date) {
					body.date = additionalFields.date as string;
				}
				if (additionalFields.number) {
					body.number = additionalFields.number as string;
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
				if (additionalFields.projectId) {
					body.project_id = additionalFields.projectId as string;
				}
				if (additionalFields.usesInclusiveTaxes) {
					body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
				}
				if (additionalFields.calculateTaxByAmount) {
					body.calculate_tax_by_amount = additionalFields.calculateTaxByAmount as boolean;
				}
				if (additionalFields.entityType) {
					body.entity_type = additionalFields.entityType as string;
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
					const perPage = this.getNodeParameter('perPage', i) as boolean;
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
