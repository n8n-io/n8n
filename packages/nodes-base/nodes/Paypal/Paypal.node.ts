import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';
import {
	payoutOpeations,
	payoutFields,
} from './PaymentDescription';
import {
	IPaymentBatch,
	ISenderBatchHeader,
	IItem, IAmount,
	RecipientType,
	RecipientWallet,
 } from './PaymentInteface';
import {
	validateJSON,
	paypalApiRequest,
	paypalApiRequestAllItems
 } from './GenericFunctions';

export class PayPal implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PayPal',
		name: 'paypal',
		icon: 'file:paypal.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume PayPal API',
		defaults: {
			name: 'PayPal',
			color: '#356ae6',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'paypalApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Payout',
						value: 'payout',
						description: 'Use the Payouts API to make payments to multiple PayPal or Venmo recipients. The Payouts API is a fast, convenient way to send commissions, rebates, rewards, and general disbursements. You can send up to 15,000 payments per call. If you integrated the Payouts API before September 1, 2017, you receive transaction reports through Mass Payments Reporting.',
					},
				],
				default: 'payout',
				description: 'Resource to consume.',
			},
			...payoutOpeations,
			...payoutFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		let qs: IDataObject = {};
		for (let i = 0; i < length; i++) {
			const resource = this.getNodeParameter('resource', 0) as string;
			const operation = this.getNodeParameter('operation', 0) as string;
			if (resource === 'payout') {
				if (operation === 'create') {
					const body: IPaymentBatch = {};
					const header: ISenderBatchHeader = {};
					const jsonActive = this.getNodeParameter('jsonParameters', i) as boolean;
					const senderBatchId = this.getNodeParameter('senderBatchId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
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
						const itemsValues = (this.getNodeParameter('itemsUi', i) as IDataObject).itemsValues as IDataObject[];
						if (itemsValues && itemsValues.length > 0) {
							itemsValues.forEach( o => {
							const payoutItem: IItem = {};
							const amount: IAmount = {};
							amount.currency = o.currency as string;
							amount.value = parseFloat(o.amount as string);
							payoutItem.amount = amount;
							payoutItem.note = o.note as string || '';
							payoutItem.receiver = o.receiverValue as string;
							payoutItem.recipient_type = o.recipientType as RecipientType;
							payoutItem.recipient_wallet = o.recipientWallet as RecipientWallet;
							payoutItem.sender_item_id = o.senderItemId as string || '';
							payoutItems.push(payoutItem);
							});
							body.items = payoutItems;
						} else {
							throw new Error('You must have at least one item.');
						}
					} else {
						const itemsJson = validateJSON(this.getNodeParameter('itemsJson', i) as string);
						body.items = itemsJson;
					}
					try {
						responseData = await paypalApiRequest.call(this, '/payments/payouts', 'POST', body);
					} catch (err) {
						throw new Error(`Paypal Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'get') {
					const payoutItemId = this.getNodeParameter('payoutItemId', i) as string;
					try {
						responseData = await paypalApiRequest.call(this,`/payments/payouts-item/${payoutItemId}`, 'GET', {}, qs);
					} catch (err) {
						throw new Error(`Paypal Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'getAll') {
					const payoutBatchId = this.getNodeParameter('payoutBatchId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
					try {
						if (returnAll === true) {
							responseData = await paypalApiRequestAllItems.call(this, 'items', `/payments/payouts/${payoutBatchId}`, 'GET', {}, qs);
						} else {
							qs.page_size = this.getNodeParameter('limit', i) as number;
							responseData = await paypalApiRequest.call(this,`/payments/payouts/${payoutBatchId}`, 'GET', {}, qs);
							responseData = responseData.items;
						}
					} catch (err) {
						throw new Error(`Paypal Error: ${JSON.stringify(err)}`);
					}
				}
				if (operation === 'delete') {
					const payoutItemId = this.getNodeParameter('payoutItemId', i) as string;
					try {
						responseData = await paypalApiRequest.call(this,`/payments/payouts-item/${payoutItemId}/cancel`, 'POST', {}, qs);
					} catch (err) {
						throw new Error(`Paypal Error: ${JSON.stringify(err)}`);
					}
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
