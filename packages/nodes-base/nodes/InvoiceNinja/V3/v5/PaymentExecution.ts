import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';
import type { IPayment } from './PaymentInterface';

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
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IPayment = {};
				if (additionalFields.assignedUserId) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.amount) {
					body.amount = additionalFields.amount as number;
				}
				if (additionalFields.refunded) {
					body.refunded = additionalFields.refunded as number;
				}
				if (additionalFields.applied) {
					body.applied = additionalFields.applied as number;
				}
				if (additionalFields.transactionReference) {
					body.transaction_reference = additionalFields.transactionReference as string;
				}
				if (additionalFields.date) {
					body.date = additionalFields.date as string;
				}
				if (additionalFields.isManual) {
					body.is_manual = additionalFields.isManual as boolean;
				}
				if (additionalFields.typeId) {
					body.type_id = additionalFields.typeId as string;
				}
				if (additionalFields.invitationId) {
					body.invitation_id = additionalFields.invitationId as string;
				}
				if (additionalFields.number) {
					body.number = additionalFields.number as string;
				}
				if (additionalFields.clientId) {
					body.client_id = additionalFields.clientId as string;
				}
				if (additionalFields.clientContactId) {
					body.client_contact_id = additionalFields.clientContactId as string;
				}
				if (additionalFields.companyGatewayId) {
					body.company_gateway_id = additionalFields.companyGatewayId as string;
				}
				if (additionalFields.statusId) {
					body.status_id = additionalFields.statusId as string;
				}
				if (additionalFields.projectId) {
					body.project_id = additionalFields.projectId as string;
				}
				if (additionalFields.vendorId) {
					body.vendor_id = additionalFields.vendorId as string;
				}
				if (additionalFields.currencyId) {
					body.currency_id = additionalFields.currencyId as string;
				}
				if (additionalFields.exchangeRate) {
					body.exchange_rate = additionalFields.exchangeRate as number;
				}
				if (additionalFields.exchangeCurrencyId) {
					body.exchange_currency_id = additionalFields.exchangeCurrencyId as string;
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
				if (additionalFields.assignedUserId) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.amount) {
					body.amount = additionalFields.amount as number;
				}
				if (additionalFields.refunded) {
					body.refunded = additionalFields.refunded as number;
				}
				if (additionalFields.applied) {
					body.applied = additionalFields.applied as number;
				}
				if (additionalFields.transactionReference) {
					body.transaction_reference = additionalFields.transactionReference as string;
				}
				if (additionalFields.date) {
					body.date = additionalFields.date as string;
				}
				if (additionalFields.isManual) {
					body.is_manual = additionalFields.isManual as boolean;
				}
				if (additionalFields.typeId) {
					body.type_id = additionalFields.typeId as string;
				}
				if (additionalFields.invitationId) {
					body.invitation_id = additionalFields.invitationId as string;
				}
				if (additionalFields.number) {
					body.number = additionalFields.number as string;
				}
				if (additionalFields.clientId) {
					body.client_id = additionalFields.clientId as string;
				}
				if (additionalFields.clientContactId) {
					body.client_contact_id = additionalFields.clientContactId as string;
				}
				if (additionalFields.companyGatewayId) {
					body.company_gateway_id = additionalFields.companyGatewayId as string;
				}
				if (additionalFields.statusId) {
					body.status_id = additionalFields.statusId as string;
				}
				if (additionalFields.projectId) {
					body.project_id = additionalFields.projectId as string;
				}
				if (additionalFields.vendorId) {
					body.vendor_id = additionalFields.vendorId as string;
				}
				if (additionalFields.currencyId) {
					body.currency_id = additionalFields.currencyId as string;
				}
				if (additionalFields.exchangeRate) {
					body.exchange_rate = additionalFields.exchangeRate as number;
				}
				if (additionalFields.exchangeCurrencyId) {
					body.exchange_currency_id = additionalFields.exchangeCurrencyId as string;
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
					const perPage = this.getNodeParameter('perPage', i) as boolean;
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
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'POST',
					`/payments/bulk`,
					{
						action,
						ids: [paymentId]
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
