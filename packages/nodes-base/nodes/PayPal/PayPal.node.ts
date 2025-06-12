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
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { payPalApiRequest, payPalApiRequestAllItems, validateJSON } from './GenericFunctions';
import {
	payoutFields,
	payoutItemFields,
	payoutItemOperations,
	payoutOperations,
} from './PaymentDescription';
import type {
	IAmount,
	IItem,
	IPaymentBatch,
	ISenderBatchHeader,
	RecipientType,
	RecipientWallet,
} from './PaymentInteface';

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
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
				],
				default: 'payout',
			},

			// Payout
			...payoutOperations,
			...payoutItemOperations,
			...payoutFields,
			...payoutItemFields,
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
				} else if (resource === 'payoutItem') {
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
