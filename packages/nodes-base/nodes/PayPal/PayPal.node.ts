import type {
	IExecuteFunctions,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import {
	payoutFields,
	payoutItemFields,
	payoutItemOperations,
	payoutOperations,
} from './PaymentDescription';
import { transactionOperations, transactionFields } from './TransactionDescription';
import type {
	IAmount,
	IItem,
	IPaymentBatch,
	ISenderBatchHeader,
	RecipientType,
	RecipientWallet,
} from './PaymentInteface';
import { payPalApiRequest, payPalApiRequestAllItems, validateJSON } from './GenericFunctions';

export class PayPal implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PayPal',
		name: 'payPal',
		icon: 'file:paypal.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume PayPal API',
		defaults: {
			name: 'PayPal',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'payPalApi',
				required: true,
				testedBy: 'payPalApiTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Payout',
						value: 'payout',
					},
					{
						name: 'Payout Item',
						value: 'payoutItem',
					},
					{
						name: 'Transaction Search',
						value: 'transactionSearch',
					},
				],
				default: 'payout',
			},

			// Payout
			...payoutOperations,
			...payoutItemOperations,
			...payoutFields,
			...payoutItemFields,
			// Transaction Search
			...transactionOperations,
			...transactionFields,
		],
	};

	methods = {
		credentialTest: {
			async payPalApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data;
				const clientId = credentials!.clientId;
				const clientSecret = credentials!.secret;
				const environment = credentials!.env;

				if (!clientId || !clientSecret || !environment) {
					return {
						status: 'Error',
						message: 'Connection details not valid: missing credentials',
					};
				}

				let baseUrl = '';
				if (environment !== 'live') {
					baseUrl = 'https://api-m.sandbox.paypal.com';
				} else {
					baseUrl = 'https://api-m.paypal.com';
				}

				const base64Key = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

				const options: IRequestOptions = {
					headers: {
						Authorization: `Basic ${base64Key}`,
					},
					method: 'POST',
					uri: `${baseUrl}/v1/oauth2/token`,
					form: {
						grant_type: 'client_credentials',
					},
				};

				try {
					await this.helpers.request(options);
					return {
						status: 'OK',
						message: 'Authentication successful!',
					};
				} catch (error) {
					return {
						status: 'Error',
						message: `Connection details not valid: ${error.message}`,
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;
		const qs: IDataObject = {};

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'payout') {
					if (operation === 'create') {
						const body: IPaymentBatch = {};
						const header: ISenderBatchHeader = {};
						const jsonActive = this.getNodeParameter('jsonParameters', i);
						const senderBatchId = this.getNodeParameter('senderBatchId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						header.sender_batch_id = senderBatchId;
						if (additionalFields.emailSubject) {
							header.email_subject = additionalFields.emailSubject as string;
						}
						if (additionalFields.emailMessage) {
							header.email_message = additionalFields.emailMessage as string;
						}
						if (additionalFields.note) {
							header.note = additionalFields.note as string;
						}
						body.sender_batch_header = header;
						if (!jsonActive) {
							const payoutItems: IItem[] = [];
							const itemsValues = (this.getNodeParameter('itemsUi', i) as IDataObject)
								.itemsValues as IDataObject[];
							if (itemsValues && itemsValues.length > 0) {
								itemsValues.forEach((o) => {
									const payoutItem: IItem = {};
									const amount: IAmount = {};
									amount.currency = o.currency as string;
									amount.value = parseFloat(o.amount as string);
									payoutItem.amount = amount;
									payoutItem.note = (o.note as string) || '';
									payoutItem.receiver = o.receiverValue as string;
									payoutItem.recipient_type = o.recipientType as RecipientType;
									payoutItem.recipient_wallet = o.recipientWallet as RecipientWallet;
									payoutItem.sender_item_id = (o.senderItemId as string) || '';
									payoutItems.push(payoutItem);
								});
								body.items = payoutItems;
							} else {
								throw new NodeOperationError(this.getNode(), 'You must have at least one item.', {
									itemIndex: i,
								});
							}
						} else {
							const itemsJson = validateJSON(this.getNodeParameter('itemsJson', i) as string);
							body.items = itemsJson;
						}
						responseData = await payPalApiRequest.call(this, '/payments/payouts', 'POST', body);
					}
					if (operation === 'get') {
						const payoutBatchId = this.getNodeParameter('payoutBatchId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', 0);
						if (returnAll) {
							responseData = await payPalApiRequestAllItems.call(
								this,
								'items',
								`/payments/payouts/${payoutBatchId}`,
								'GET',
								{},
								qs,
							);
						} else {
							qs.page_size = this.getNodeParameter('limit', i);
							responseData = await payPalApiRequest.call(
								this,
								`/payments/payouts/${payoutBatchId}`,
								'GET',
								{},
								qs,
							);
							responseData = responseData.items;
						}
					}
				}

				if (resource === 'payoutItem') {
					if (operation === 'get') {
						const payoutItemId = this.getNodeParameter('payoutItemId', i) as string;
						responseData = await payPalApiRequest.call(
							this,
							`/payments/payouts-item/${payoutItemId}`,
							'GET',
							{},
							qs,
						);
					}
					if (operation === 'cancel') {
						const payoutItemId = this.getNodeParameter('payoutItemId', i) as string;
						responseData = await payPalApiRequest.call(
							this,
							`/payments/payouts-item/${payoutItemId}/cancel`,
							'POST',
							{},
							qs,
						);
					}
				}
				if (resource === 'transactionSearch') {
					if (operation === 'listtransactions') {
						const transaction_id = this.getNodeParameter('transaction_id', i) as string;
						const transaction_type = this.getNodeParameter('transaction_type', i) as string;
						const transaction_status = this.getNodeParameter('transaction_status', i) as string;
						const transaction_amount = this.getNodeParameter('transaction_amount', i) as string;
						const transaction_currency = this.getNodeParameter('transaction_currency', i) as string;
						const start_date = this.getNodeParameter('start_date', i) as string;
						const end_date = this.getNodeParameter('end_date', i) as string;
						const payment_instrument_type = this.getNodeParameter(
							'payment_instrument_type',
							i,
						) as string;
						const store_id = this.getNodeParameter('store_id', i) as string;
						const terminal_id = this.getNodeParameter('terminal_id', i) as string;
						const fields = this.getNodeParameter('fields', i) as string;
						const balance_affecting_records_only = this.getNodeParameter(
							'balance_affecting_records_only',
							i,
						) as string;

						/*				        const qs = {
				          transaction_id,
				          transaction_type,
				          transaction_status,
				          transaction_amount,
				          transaction_currency,
				          start_date: new Date(start_date).toISOString(),
				          end_date: new Date(end_date).toISOString(),
				          payment_instrument_type,
				          store_id,
				          terminal_id,
				          fields,
				          balance_affecting_records_only,
				        };*/

						qs.start_date = new Date(start_date).toISOString();
						qs.end_date = new Date(end_date).toISOString();

						if (transaction_id) {
							qs.transaction_id = transaction_id;
						}
						if (transaction_type) {
							qs.transaction_type = transaction_type;
						}
						if (transaction_status) {
							qs.transaction_status = transaction_status;
						}
						if (transaction_amount) {
							qs.transaction_amount = transaction_amount;
						}
						if (transaction_currency) {
							qs.transaction_currency = transaction_currency;
						}
						if (payment_instrument_type) {
							qs.payment_instrument_type = payment_instrument_type;
						}
						if (store_id) {
							qs.store_id = store_id;
						}
						if (terminal_id) {
							qs.terminal_id = terminal_id;
						}
						if (fields) {
							qs.fields = fields;
						}
						if (balance_affecting_records_only) {
							qs.balance_affecting_records_only = balance_affecting_records_only;
						}

						responseData = await payPalApiRequest.call(
							this,
							'/reporting/transactions',
							'GET',
							{},
							qs,
						);
					}
					if (operation === 'listAllBalances') {
						const as_of_time = this.getNodeParameter('as_of_time', 0) as string;
						const currency_code = this.getNodeParameter('currency_code', 0) as string;

						// Ensure dates are in the correct ISO 8601 format with timezone
						const formattedas_of_time = new Date(as_of_time).toISOString();

						// Construct request parameters
						const qs = {
							as_of_time: formattedas_of_time,
							currency_code: currency_code,
						};

						// Make the API request
						responseData = await payPalApiRequest.call(this, '/reporting/balances', 'GET', {}, qs);
					}
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
		return [returnData];
	}
}
