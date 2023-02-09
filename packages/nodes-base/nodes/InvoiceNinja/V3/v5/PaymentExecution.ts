import moment from 'moment';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';
import type { IPayment, IPaymentAssignInvoice } from './PaymentInterface';

export const execute = async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;
	const qs: IDataObject = {};

	let responseData;

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	if (resource !== 'payment') throw new Error('Invalid Resource Execution Handler');

	for (let i = 0; i < length; i++) {
		//Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
		try {
			if (operation === 'create') {
				const clientId = this.getNodeParameter('clientId', i);
				const amount = this.getNodeParameter('amount', i);
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IPayment = {};
				body.client_id = clientId as string;
				body.amount = amount as number;
				if (additionalFields.assignedUserId !== undefined) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.amount !== undefined) {
					body.amount = additionalFields.amount as number;
				}
				if (additionalFields.transactionReference !== undefined) {
					body.transaction_reference = additionalFields.transactionReference as string;
				}
				if (additionalFields.date !== undefined) {
					body.date = moment(additionalFields.date as string).format('YYYY-MM-DD');
				}
				if (additionalFields.typeId !== undefined) {
					body.type_id = additionalFields.typeId as string;
				}
				if (additionalFields.number !== undefined) {
					body.number = additionalFields.number as string;
				}
				if (additionalFields.exchangeRate !== undefined) {
					body.exchange_rate = additionalFields.exchangeRate as number;
				}
				if (additionalFields.exchangeCurrencyId !== undefined) {
					body.exchange_currency_id = additionalFields.exchangeCurrencyId as string;
				}
				if (additionalFields.privateNotes !== undefined) {
					body.private_notes = additionalFields.privateNotes as string;
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
				const assignInvoicesValues = (this.getNodeParameter('assignInvoicesUi', i) as IDataObject)
					.assignInvoicesValues as IDataObject[];
				if (assignInvoicesValues) {
					const assignInvoicesItems: IPaymentAssignInvoice[] = [];
					for (const itemValue of assignInvoicesValues) {
						const item: IPaymentAssignInvoice = {
							invoice_id: itemValue.invoiceId as string,
							amount: itemValue.amount as number,
						};
						assignInvoicesItems.push(item);
					}
					body.invoices = assignInvoicesItems;
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'POST',
					'/payments',
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'update') {
				const paymentId = this.getNodeParameter('paymentId', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IPayment = {};
				if (additionalFields.assignedUserId !== undefined) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.transactionReference !== undefined) {
					body.transaction_reference = additionalFields.transactionReference as string;
				}
				if (additionalFields.date !== undefined) {
					body.date = moment(additionalFields.date as string).format('YYYY-MM-DD');
				}
				if (additionalFields.typeId !== undefined) {
					body.type_id = additionalFields.typeId as string;
				}
				if (additionalFields.number !== undefined) {
					body.number = additionalFields.number as string;
				}
				if (additionalFields.exchangeRate !== undefined) {
					body.exchange_rate = additionalFields.exchangeRate as number;
				}
				if (additionalFields.exchangeCurrencyId !== undefined) {
					body.exchange_currency_id = additionalFields.exchangeCurrencyId as string;
				}
				if (additionalFields.privateNotes !== undefined) {
					body.private_notes = additionalFields.privateNotes as string;
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
				const assignInvoicesValues = (this.getNodeParameter('assignInvoicesUi', i) as IDataObject)
					.assignInvoicesValues as IDataObject[];
				if (assignInvoicesValues) {
					const assignInvoicesItems: IPaymentAssignInvoice[] = [];
					for (const itemValue of assignInvoicesValues) {
						const item: IPaymentAssignInvoice = {
							invoice_id: itemValue.invoiceId as string,
							amount: itemValue.amount as number,
						};
						assignInvoicesItems.push(item);
					}
					body.invoices = assignInvoicesItems;
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'PUT',
					`/payments/${paymentId}`,
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'get') {
				const paymentId = this.getNodeParameter('paymentId', i) as string;
				const include = this.getNodeParameter('include', i) as string[];
				if (include.length) {
					qs.include = include.toString();
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'GET',
					`/payments/${paymentId}`,
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
						'/payments',
						{},
						qs,
					);
				} else {
					const perPage = this.getNodeParameter('perPage', i) as number;
					if (perPage) qs.per_page = perPage;
					responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/payments', {}, qs);
					responseData = responseData.data;
				}
			}
			if (operation === 'delete') {
				const paymentId = this.getNodeParameter('paymentId', i) as string;
				responseData = await invoiceNinjaApiRequest.call(this, 'DELETE', `/payments/${paymentId}`);
				responseData = responseData.data;
			}
			if (operation === 'action') {
				const paymentId = this.getNodeParameter('paymentId', i) as string;
				const action = this.getNodeParameter('action', i) as string;
				if (action === 'refund') {
					const amount = this.getNodeParameter('amount', i) as number;
					const body: {
						id: string;
						amount: number;
						invoices?: IPaymentAssignInvoice[];
					} = {
						id: paymentId,
						amount,
					};
					const refundInvoicesValues = (this.getNodeParameter('refundInvoicesUi', i) as IDataObject)
						.refundInvoicesValues as IDataObject[];
					if (refundInvoicesValues) {
						const refundInvoicesItems: IPaymentAssignInvoice[] = [];
						for (const itemValue of refundInvoicesValues) {
							const item: IPaymentAssignInvoice = {
								invoice_id: itemValue.invoiceId as string,
								amount: itemValue.amount as number,
							};
							refundInvoicesItems.push(item);
						}
						body.invoices = refundInvoicesItems;
					}
					const emailReceipt = this.getNodeParameter('emailReceipt', i) as boolean;
					responseData = await invoiceNinjaApiRequest.call(
						this,
						'GET',
						`/payments/${paymentId}`,
						{},
						qs,
					);
					responseData = responseData.data;
					responseData = await invoiceNinjaApiRequest.call(
						this,
						'POST',
						'/payments/refund',
						{
							...responseData,
							...body,
						},
						{
							emailReceipt,
						},
					);
					responseData = responseData.data;
				} else {
					responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/payments/bulk', {
						action,
						ids: [paymentId],
					});
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
