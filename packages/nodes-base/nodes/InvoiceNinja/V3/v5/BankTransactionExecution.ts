import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';
import type { IBankTransaction } from './BankTransactionInterface';

export const execute = async function (that: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = that.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;
	const qs: IDataObject = {};

	let responseData;

	const resource = that.getNodeParameter('resource', 0);
	const operation = that.getNodeParameter('operation', 0);
	if (resource !== 'bankTransaction') throw new Error('Invalid Resource Execution Handler');

	for (let i = 0; i < length; i++) {
		//Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
		try {
			if (operation === 'create') {
				const additionalFields = that.getNodeParameter('additionalFields', i);
				const body: IBankTransaction = {};
				if (additionalFields.accountType) {
					body.account_type = additionalFields.accountType as string;
				}
				if (additionalFields.amount) {
					body.amount = additionalFields.amount as number;
				}
				if (additionalFields.bankIntegrationId) {
					body.bank_integration_id = additionalFields.bankIntegrationId as string;
				}
				if (additionalFields.bankTransactionRuleId) {
					body.bank_transaction_rule_id = additionalFields.bankTransactionRuleId as string;
				}
				if (additionalFields.baseType) {
					body.base_type = additionalFields.baseType as string;
				}
				if (additionalFields.categoryId) {
					body.category_id = additionalFields.categoryId as number;
				}
				if (additionalFields.categoryType) {
					body.category_type = additionalFields.categoryType as string;
				}
				if (additionalFields.currencyId) {
					body.currency_id = additionalFields.currencyId as string;
				}
				if (additionalFields.date) {
					body.date = additionalFields.date as string;
				}
				if (additionalFields.description) {
					body.description = additionalFields.description as string;
				}
				if (additionalFields.expenseId) {
					body.expense_id = additionalFields.expenseId as string;
				}
				if (additionalFields.invoiceIds) {
					body.invoice_ids = additionalFields.invoiceIds as string;
				}
				if (additionalFields.ninjaCategoryId) {
					body.ninja_category_id = additionalFields.ninjaCategoryId as string;
				}
				if (additionalFields.paymentId) {
					body.payment_id = additionalFields.paymentId as string;
				}
				if (additionalFields.statusId) {
					body.status_id = additionalFields.statusId as string;
				}
				if (additionalFields.transactionId) {
					body.transaction_id = additionalFields.transactionId as number;
				}
				if (additionalFields.vendorId) {
					body.vendor_id = additionalFields.vendorId as string;
				}
				responseData = await invoiceNinjaApiRequest.call(
					that,
					'POST',
					'/bank_transactions',
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'update') {
				const bankTransactionId = that.getNodeParameter('bankTransactionId', i) as string;
				const additionalFields = that.getNodeParameter('additionalFields', i);
				const body: IBankTransaction = {};
				if (additionalFields.accountType) {
					body.account_type = additionalFields.accountType as string;
				}
				if (additionalFields.amount) {
					body.amount = additionalFields.amount as number;
				}
				if (additionalFields.bankIntegrationId) {
					body.bank_integration_id = additionalFields.bankIntegrationId as string;
				}
				if (additionalFields.bankTransactionRuleId) {
					body.bank_transaction_rule_id = additionalFields.bankTransactionRuleId as string;
				}
				if (additionalFields.baseType) {
					body.base_type = additionalFields.baseType as string;
				}
				if (additionalFields.categoryId) {
					body.category_id = additionalFields.categoryId as number;
				}
				if (additionalFields.categoryType) {
					body.category_type = additionalFields.categoryType as string;
				}
				if (additionalFields.currencyId) {
					body.currency_id = additionalFields.currencyId as string;
				}
				if (additionalFields.date) {
					body.date = additionalFields.date as string;
				}
				if (additionalFields.description) {
					body.description = additionalFields.description as string;
				}
				if (additionalFields.expenseId) {
					body.expense_id = additionalFields.expenseId as string;
				}
				if (additionalFields.invoiceIds) {
					body.invoice_ids = additionalFields.invoiceIds as string;
				}
				if (additionalFields.ninjaCategoryId) {
					body.ninja_category_id = additionalFields.ninjaCategoryId as string;
				}
				if (additionalFields.paymentId) {
					body.payment_id = additionalFields.paymentId as string;
				}
				if (additionalFields.statusId) {
					body.status_id = additionalFields.statusId as string;
				}
				if (additionalFields.transactionId) {
					body.transaction_id = additionalFields.transactionId as number;
				}
				if (additionalFields.vendorId) {
					body.vendor_id = additionalFields.vendorId as string;
				}
				responseData = await invoiceNinjaApiRequest.call(
					that,
					'PUT',
					`/bank_transactions/${bankTransactionId}`,
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'get') {
				const bankTransactionId = that.getNodeParameter('bankTransactionId', i) as string;
				const include = that.getNodeParameter('include', i) as string[];
				if (include.length) {
					qs.include = include.toString();
				}
				responseData = await invoiceNinjaApiRequest.call(
					that,
					'GET',
					`/bank_transactions/${bankTransactionId}`,
					{},
					qs,
				);
				responseData = responseData.data;
			}
			if (operation === 'getAll') {
				const filters = that.getNodeParameter('filters', i);
				if (filters.filter) {
					qs.filter = filters.filter as string;
				}
				if (filters.name) {
					qs.name = filters.name as string;
				}
				if (filters.client_status) {
					qs.client_status = filters.client_status.toString();
				}
				const include = that.getNodeParameter('include', i) as string[];
				if (include.length) {
					qs.include = include.toString();
				}
				const returnAll = that.getNodeParameter('returnAll', i);
				if (returnAll) {
					responseData = await invoiceNinjaApiRequestAllItems.call(
						that,
						'data',
						'GET',
						'/bank_transactions',
						{},
						qs,
					);
				} else {
					const perPage = that.getNodeParameter('perPage', i) as boolean;
					if (perPage) qs.per_page = perPage;
					responseData = await invoiceNinjaApiRequest.call(that, 'GET', '/transactions', {}, qs);
					responseData = responseData.data;
				}
			}
			if (operation === 'delete') {
				const bankTransactionId = that.getNodeParameter('bankTransactionId', i) as string;
				responseData = await invoiceNinjaApiRequest.call(
					that,
					'DELETE',
					`/bank_transactions/${bankTransactionId}`,
				);
				responseData = responseData.data;
			}
			if (operation === 'action') {
				const bankTransactionId = that.getNodeParameter('bankTransactionId', i) as string;
				const action = that.getNodeParameter('action', i) as string;
				if (action == 'convert_matched') {
					const convertMatchedVendorId = that.getNodeParameter('convertMatchedVendorId', i) as string;
					const convertMatchedExpenseIds = that.getNodeParameter('convertMatchedExpenseIds', i) as string;
					const convertMatchedInvoiceIds = that.getNodeParameter('convertMatchedInvoiceIds', i) as string;
					const convertMatchedPaymentId = that.getNodeParameter('convertMatchedPaymentId', i) as string;
					responseData = await invoiceNinjaApiRequest.call(
						that,
						'POST',
						`/bank_transactions/match`,
						{
							transactions: [
								{
									id: bankTransactionId,
									vendor_id: convertMatchedVendorId ? convertMatchedVendorId : undefined,
									expense_id: convertMatchedExpenseIds ? convertMatchedExpenseIds : undefined,
									invoice_ids: convertMatchedInvoiceIds ? convertMatchedInvoiceIds : undefined,
									payment_id: convertMatchedPaymentId ? convertMatchedPaymentId : undefined,
								}
							]
						}
					);
					responseData = responseData.data[0];
				} else {
					responseData = await invoiceNinjaApiRequest.call(
						that,
						'POST',
						`/bank_transactions/bulk`,
						{
							action,
							ids: [bankTransactionId]
						}
					);
					responseData = responseData.data[0];
				}
			}

			const executionData = that.helpers.constructExecutionMetaData(
				that.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			if (that.continueOnFail()) {
				const executionErrorData = that.helpers.constructExecutionMetaData(
					that.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionErrorData);
				continue;
			}
			throw error;
		}
	}

	return that.prepareOutputData(returnData);
};
