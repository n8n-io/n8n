import moment from 'moment';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';
import type { IBankTransaction } from './BankTransactionInterface';

export const execute = async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;
	const qs: IDataObject = {};

	let responseData;

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	if (resource !== 'bankTransaction') throw new Error('Invalid Resource Execution Handler');

	for (let i = 0; i < length; i++) {
		//Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
		try {
			if (operation === 'create') {
				const bankIntegrationId = this.getNodeParameter('bankIntegrationId', i);
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IBankTransaction = {};
				body.bank_integration_id = bankIntegrationId as string;
				if (additionalFields.amount !== undefined) {
					body.amount = additionalFields.amount as number;
				}
				if (additionalFields.bankAccountId !== undefined) {
					body.bank_account_id = additionalFields.bankAccountId as number;
				}
				if (additionalFields.bankTransactionRuleId !== undefined) {
					body.bank_transaction_rule_id = additionalFields.bankTransactionRuleId as string;
				}
				if (additionalFields.baseType !== undefined) {
					body.base_type = additionalFields.baseType as string;
				}
				if (additionalFields.currencyId !== undefined) {
					body.currency_id = additionalFields.currencyId as string;
				}
				if (additionalFields.date !== undefined) {
					body.date = moment(additionalFields.date as string).format("YYYY-MM-DD");
				}
				if (additionalFields.description !== undefined) {
					body.description = additionalFields.description as string;
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'POST',
					'/bank_transactions',
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'update') {
				const bankTransactionId = this.getNodeParameter('bankTransactionId', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IBankTransaction = {};
				if (additionalFields.bankIntegrationId) {
					body.bank_integration_id = additionalFields.bankIntegrationId as string;
				}
				if (additionalFields.amount !== undefined) {
					body.amount = additionalFields.amount as number;
				}
				if (additionalFields.bankAccountId !== undefined) {
					body.bank_account_id = additionalFields.bankAccountId as number;
				}
				if (additionalFields.bankTransactionRuleId !== undefined) {
					body.bank_transaction_rule_id = additionalFields.bankTransactionRuleId as string;
				}
				if (additionalFields.baseType !== undefined) {
					body.base_type = additionalFields.baseType as string;
				}
				if (additionalFields.currencyId !== undefined) {
					body.currency_id = additionalFields.currencyId as string;
				}
				if (additionalFields.date !== undefined) {
					body.date = moment(additionalFields.date as string).format("YYYY-MM-DD");
				}
				if (additionalFields.description !== undefined) {
					body.description = additionalFields.description as string;
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'PUT',
					`/bank_transactions/${bankTransactionId}`,
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'get') {
				const bankTransactionId = this.getNodeParameter('bankTransactionId', i) as string;
				const include = this.getNodeParameter('include', i) as string[];
				if (include.length) {
					qs.include = include.toString();
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'GET',
					`/bank_transactions/${bankTransactionId}`,
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
				if (filters.name) {
					qs.name = filters.name as string;
				}
				if (filters.client_status) {
					qs.client_status = filters.client_status.toString();
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
						'/bank_transactions',
						{},
						qs,
					);
				} else {
					const perPage = this.getNodeParameter('perPage', i) as number;
					if (perPage) qs.per_page = perPage;
					responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/bank_transactions', {}, qs);
					responseData = responseData.data;
				}
			}
			if (operation === 'delete') {
				const bankTransactionId = this.getNodeParameter('bankTransactionId', i) as string;
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'DELETE',
					`/bank_transactions/${bankTransactionId}`,
				);
				responseData = responseData.data;
			}
			if (operation === 'action') {
				const bankTransactionId = this.getNodeParameter('bankTransactionId', i) as string;
				const action = this.getNodeParameter('action', i) as string;
				if (action == 'convert_matched') {
					const convertMatchedVendorId = this.getNodeParameter('convertMatchedVendorId', i) as string;
					const convertMatchedExpenseIds = this.getNodeParameter('convertMatchedExpenseIds', i) as string;
					const convertMatchedInvoiceIds = this.getNodeParameter('convertMatchedInvoiceIds', i) as string;
					const convertMatchedPaymentId = this.getNodeParameter('convertMatchedPaymentId', i) as string;
					responseData = await invoiceNinjaApiRequest.call(
						this,
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
					// return data of the transaction, because otherwise there woulnt be any
					responseData = await invoiceNinjaApiRequest.call(
						this,
						'GET',
						`/bank_transactions/${bankTransactionId}`,
						{},
						qs,
					);
					responseData = responseData.data;
				} else {
					responseData = await invoiceNinjaApiRequest.call(
						this,
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
