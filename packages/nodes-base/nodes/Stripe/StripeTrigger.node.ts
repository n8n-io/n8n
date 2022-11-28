/* eslint-disable n8n-nodes-base/node-param-description-excess-final-period */
import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeApiError,
} from 'n8n-workflow';

import { stripeApiRequest } from './helpers';

export class StripeTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Stripe Trigger',
		name: 'stripeTrigger',
		icon: 'file:stripe.svg',
		group: ['trigger'],
		version: 1,
		description: 'Handle Stripe events via webhooks',
		defaults: {
			name: 'Stripe Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'stripeApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				reponseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'The event to listen to',
				// eslint-disable-next-line n8n-nodes-base/node-param-multi-options-type-unsorted-items
				options: [
					{
						name: '*',
						value: '*',
						description: 'Any time any event is triggered (Wildcard Event)',
					},
					{
						name: 'Account Updated',
						value: 'account.updated',
						description: 'Occurs whenever an account status or property has changed',
					},
					{
						name: 'Account Application.authorized',
						value: 'account.application.authorized',
						description:
							'Occurs whenever a user authorizes an application. Sent to the related application only.',
					},
					{
						name: 'Account Application.deauthorized',
						value: 'account.application.deauthorized',
						description:
							'Occurs whenever a user deauthorizes an application. Sent to the related application only.',
					},
					{
						name: 'Account External_account.created',
						value: 'account.external_account.created',
						description: 'Occurs whenever an external account is created.',
					},
					{
						name: 'Account External_account.deleted',
						value: 'account.external_account.deleted',
						description: 'Occurs whenever an external account is deleted.',
					},
					{
						name: 'Account External_account.updated',
						value: 'account.external_account.updated',
						description: 'Occurs whenever an external account is updated.',
					},
					{
						name: 'Application Fee.created',
						value: 'application_fee.created',
						description: 'Occurs whenever an application fee is created on a charge.',
					},
					{
						name: 'Application Fee.refunded',
						value: 'application_fee.refunded',
						description:
							'Occurs whenever an application fee is refunded, whether from refunding a charge or from refunding the application fee directly. This includes partial refunds.',
					},
					{
						name: 'Application Fee.refund.updated',
						value: 'application_fee.refund.updated',
						description: 'Occurs whenever an application fee refund is updated.',
					},
					{
						name: 'Balance Available',
						value: 'balance.available',
						description:
							'Occurs whenever your Stripe balance has been updated (e.g., when a charge is available to be paid out). By default, Stripe automatically transfers funds in your balance to your bank account on a daily basis.',
					},
					{
						name: 'Capability Updated',
						value: 'capability.updated',
						description: 'Occurs whenever a capability has new requirements or a new status.',
					},
					{
						name: 'Charge Captured',
						value: 'charge.captured',
						description: 'Occurs whenever a previously uncaptured charge is captured.',
					},
					{
						name: 'Charge Expired',
						value: 'charge.expired',
						description: 'Occurs whenever an uncaptured charge expires.',
					},
					{
						name: 'Charge Failed',
						value: 'charge.failed',
						description: 'Occurs whenever a failed charge attempt occurs.',
					},
					{
						name: 'Charge Pending',
						value: 'charge.pending',
						description: 'Occurs whenever a pending charge is created.',
					},
					{
						name: 'Charge Refunded',
						value: 'charge.refunded',
						description: 'Occurs whenever a charge is refunded, including partial refunds.',
					},
					{
						name: 'Charge Succeeded',
						value: 'charge.succeeded',
						description: 'Occurs whenever a new charge is created and is successful.',
					},
					{
						name: 'Charge Updated',
						value: 'charge.updated',
						description: 'Occurs whenever a charge description or metadata is updated.',
					},
					{
						name: 'Charge Dispute.closed',
						value: 'charge.dispute.closed',
						description:
							'Occurs when a dispute is closed and the dispute status changes to lost, warning_closed, or won.',
					},
					{
						name: 'Charge Dispute.created',
						value: 'charge.dispute.created',
						description: 'Occurs whenever a customer disputes a charge with their bank.',
					},
					{
						name: 'Charge Dispute.funds_reinstated',
						value: 'charge.dispute.funds_reinstated',
						description:
							'Occurs when funds are reinstated to your account after a dispute is closed. This includes partially refunded payments.',
					},
					{
						name: 'Charge Dispute.funds_withdrawn',
						value: 'charge.dispute.funds_withdrawn',
						description: 'Occurs when funds are removed from your account due to a dispute.',
					},
					{
						name: 'Charge Dispute.updated',
						value: 'charge.dispute.updated',
						description: 'Occurs when the dispute is updated (usually with evidence).',
					},
					{
						name: 'Charge Refund.updated',
						value: 'charge.refund.updated',
						description: 'Occurs whenever a refund is updated, on selected payment methods.',
					},
					{
						name: 'Checkout Session.completed',
						value: 'checkout.session.completed',
						description: 'Occurs when a Checkout Session has been successfully completed.',
					},
					{
						name: 'Coupon Created',
						value: 'coupon.created',
						description: 'Occurs whenever a coupon is created.',
					},
					{
						name: 'Coupon Deleted',
						value: 'coupon.deleted',
						description: 'Occurs whenever a coupon is deleted.',
					},
					{
						name: 'Coupon Updated',
						value: 'coupon.updated',
						description: 'Occurs whenever a coupon is updated.',
					},
					{
						name: 'Credit Note.created',
						value: 'credit_note.created',
						description: 'Occurs whenever a credit note is created.',
					},
					{
						name: 'Credit Note.updated',
						value: 'credit_note.updated',
						description: 'Occurs whenever a credit note is updated.',
					},
					{
						name: 'Credit Note.voided',
						value: 'credit_note.voided',
						description: 'Occurs whenever a credit note is voided.',
					},
					{
						name: 'Customer Created',
						value: 'customer.created',
						description: 'Occurs whenever a new customer is created.',
					},
					{
						name: 'Customer Deleted',
						value: 'customer.deleted',
						description: 'Occurs whenever a customer is deleted.',
					},
					{
						name: 'Customer Updated',
						value: 'customer.updated',
						description: 'Occurs whenever any property of a customer changes.',
					},
					{
						name: 'Customer Discount.created',
						value: 'customer.discount.created',
						description: 'Occurs whenever a coupon is attached to a customer.',
					},
					{
						name: 'Customer Discount.deleted',
						value: 'customer.discount.deleted',
						description: 'Occurs whenever a coupon is removed from a customer.',
					},
					{
						name: 'Customer Discount.updated',
						value: 'customer.discount.updated',
						description: 'Occurs whenever a customer is switched from one coupon to another.',
					},
					{
						name: 'Customer Source.created',
						value: 'customer.source.created',
						description: 'Occurs whenever a new source is created for a customer.',
					},
					{
						name: 'Customer Source.deleted',
						value: 'customer.source.deleted',
						description: 'Occurs whenever a source is removed from a customer.',
					},
					{
						name: 'Customer Source.expiring',
						value: 'customer.source.expiring',
						description: 'Occurs whenever a card or source will expire at the end of the month.',
					},
					{
						name: 'Customer Source.updated',
						value: 'customer.source.updated',
						description: "Occurs whenever a source's details are changed.",
					},
					{
						name: 'Customer Subscription.created',
						value: 'customer.subscription.created',
						description: 'Occurs whenever a customer is signed up for a new plan.',
					},
					{
						name: 'Customer Subscription.deleted',
						value: 'customer.subscription.deleted',
						description: "Occurs whenever a customer's subscription ends.",
					},
					{
						name: 'Customer Subscription.trial_will_end',
						value: 'customer.subscription.trial_will_end',
						description:
							"Occurs three days before a subscription's trial period is scheduled to end, or when a trial is ended immediately (using trial_end=now).",
					},
					{
						name: 'Customer Subscription.updated',
						value: 'customer.subscription.updated',
						description:
							'Occurs whenever a subscription changes (e.g., switching from one plan to another, or changing the status from trial to active).',
					},
					{
						name: 'Customer Tax_id.created',
						value: 'customer.tax_id.created',
						description: 'Occurs whenever a tax ID is created for a customer.',
					},
					{
						name: 'Customer Tax_id.deleted',
						value: 'customer.tax_id.deleted',
						description: 'Occurs whenever a tax ID is deleted from a customer.',
					},
					{
						name: 'Customer Tax_id.updated',
						value: 'customer.tax_id.updated',
						description: "Occurs whenever a customer's tax ID is updated.",
					},
					{
						name: 'File Created',
						value: 'file.created',
						description:
							'Occurs whenever a new Stripe-generated file is available for your account.',
					},
					{
						name: 'Invoice Created',
						value: 'invoice.created',
						description:
							'Occurs whenever a new invoice is created. To learn how webhooks can be used with this event, and how they can affect it, see Using Webhooks with Subscriptions.',
					},
					{
						name: 'Invoice Deleted',
						value: 'invoice.deleted',
						description: 'Occurs whenever a draft invoice is deleted.',
					},
					{
						name: 'Invoice Finalized',
						value: 'invoice.finalized',
						description:
							'Occurs whenever a draft invoice is finalized and updated to be an open invoice.',
					},
					{
						name: 'Invoice Marked_uncollectible',
						value: 'invoice.marked_uncollectible',
						description: 'Occurs whenever an invoice is marked uncollectible.',
					},
					{
						name: 'Invoice Payment_action_required',
						value: 'invoice.payment_action_required',
						description:
							'Occurs whenever an invoice payment attempt requires further user action to complete.',
					},
					{
						name: 'Invoice Payment_failed',
						value: 'invoice.payment_failed',
						description:
							'Occurs whenever an invoice payment attempt fails, due either to a declined payment or to the lack of a stored payment method.',
					},
					{
						name: 'Invoice Payment_succeeded',
						value: 'invoice.payment_succeeded',
						description: 'Occurs whenever an invoice payment attempt succeeds.',
					},
					{
						name: 'Invoice Sent',
						value: 'invoice.sent',
						description: 'Occurs whenever an invoice email is sent out.',
					},
					{
						name: 'Invoice Upcoming',
						value: 'invoice.upcoming',
						description:
							'Occurs X number of days before a subscription is scheduled to create an invoice that is automatically charged—where X is determined by your subscriptions settings. Note: The received Invoice object will not have an invoice ID.',
					},
					{
						name: 'Invoice Updated',
						value: 'invoice.updated',
						description: 'Occurs whenever an invoice changes (e.g., the invoice amount).',
					},
					{
						name: 'Invoice Voided',
						value: 'invoice.voided',
						description: 'Occurs whenever an invoice is voided.',
					},
					{
						name: 'Invoiceitem Created',
						value: 'invoiceitem.created',
						description: 'Occurs whenever an invoice item is created.',
					},
					{
						name: 'Invoiceitem Deleted',
						value: 'invoiceitem.deleted',
						description: 'Occurs whenever an invoice item is deleted.',
					},
					{
						name: 'Invoiceitem Updated',
						value: 'invoiceitem.updated',
						description: 'Occurs whenever an invoice item is updated.',
					},
					{
						name: 'Issuing Authorization.created',
						value: 'issuing_authorization.created',
						description: 'Occurs whenever an authorization is created.',
					},
					{
						name: 'Issuing Authorization.request',
						value: 'issuing_authorization.request',
						description:
							'Represents a synchronous request for authorization, see Using your integration to handle authorization requests.',
					},
					{
						name: 'Issuing Authorization.updated',
						value: 'issuing_authorization.updated',
						description: 'Occurs whenever an authorization is updated.',
					},
					{
						name: 'Issuing Card.created',
						value: 'issuing_card.created',
						description: 'Occurs whenever a card is created.',
					},
					{
						name: 'Issuing Card.updated',
						value: 'issuing_card.updated',
						description: 'Occurs whenever a card is updated.',
					},
					{
						name: 'Issuing Cardholder.created',
						value: 'issuing_cardholder.created',
						description: 'Occurs whenever a cardholder is created.',
					},
					{
						name: 'Issuing Cardholder.updated',
						value: 'issuing_cardholder.updated',
						description: 'Occurs whenever a cardholder is updated.',
					},
					{
						name: 'Issuing Dispute.created',
						value: 'issuing_dispute.created',
						description: 'Occurs whenever a dispute is created.',
					},
					{
						name: 'Issuing Dispute.updated',
						value: 'issuing_dispute.updated',
						description: 'Occurs whenever a dispute is updated.',
					},
					{
						name: 'Issuing Settlement.created',
						value: 'issuing_settlement.created',
						description: 'Occurs whenever an issuing settlement is created.',
					},
					{
						name: 'Issuing Settlement.updated',
						value: 'issuing_settlement.updated',
						description: 'Occurs whenever an issuing settlement is updated.',
					},
					{
						name: 'Issuing Transaction.created',
						value: 'issuing_transaction.created',
						description: 'Occurs whenever an issuing transaction is created.',
					},
					{
						name: 'Issuing Transaction.updated',
						value: 'issuing_transaction.updated',
						description: 'Occurs whenever an issuing transaction is updated.',
					},
					{
						name: 'Order Created',
						value: 'order.created',
						description: 'Occurs whenever an order is created.',
					},
					{
						name: 'Order Payment_failed',
						value: 'order.payment_failed',
						description: 'Occurs whenever an order payment attempt fails.',
					},
					{
						name: 'Order Payment_succeeded',
						value: 'order.payment_succeeded',
						description: 'Occurs whenever an order payment attempt succeeds.',
					},
					{
						name: 'Order Updated',
						value: 'order.updated',
						description: 'Occurs whenever an order is updated.',
					},
					{
						name: 'Order Return.created',
						value: 'order_return.created',
						description: 'Occurs whenever an order return is created.',
					},
					{
						name: 'Payment Intent.amount_capturable_updated',
						value: 'payment_intent.amount_capturable_updated',
						description:
							'Occurs when a PaymentIntent has funds to be captured. Check the amount_capturable property on the PaymentIntent to determine the amount that can be captured. You may capture the PaymentIntent with an amount_to_capture value up to the specified amount. Learn more about capturing PaymentIntents.',
					},
					{
						name: 'Payment Intent.canceled',
						value: 'payment_intent.canceled',
						description: 'Occurs when a PaymentIntent is canceled.',
					},
					{
						name: 'Payment Intent.created',
						value: 'payment_intent.created',
						description: 'Occurs when a new PaymentIntent is created.',
					},
					{
						name: 'Payment Intent.payment_failed',
						value: 'payment_intent.payment_failed',
						description:
							'Occurs when a PaymentIntent has failed the attempt to create a source or a payment.',
					},
					{
						name: 'Payment Intent.succeeded',
						value: 'payment_intent.succeeded',
						description: 'Occurs when a PaymentIntent has been successfully fulfilled.',
					},
					{
						name: 'Payment Method.attached',
						value: 'payment_method.attached',
						description: 'Occurs whenever a new payment method is attached to a customer.',
					},
					{
						name: 'Payment Method.card_automatically_updated',
						value: 'payment_method.card_automatically_updated',
						description:
							"Occurs whenever a card payment method's details are automatically updated by the network.",
					},
					{
						name: 'Payment Method.detached',
						value: 'payment_method.detached',
						description: 'Occurs whenever a payment method is detached from a customer.',
					},
					{
						name: 'Payment Method.updated',
						value: 'payment_method.updated',
						description:
							'Occurs whenever a payment method is updated via the PaymentMethod update API.',
					},
					{
						name: 'Payout Canceled',
						value: 'payout.canceled',
						description: 'Occurs whenever a payout is canceled.',
					},
					{
						name: 'Payout Created',
						value: 'payout.created',
						description: 'Occurs whenever a payout is created.',
					},
					{
						name: 'Payout Failed',
						value: 'payout.failed',
						description: 'Occurs whenever a payout attempt fails.',
					},
					{
						name: 'Payout Paid',
						value: 'payout.paid',
						description:
							'Occurs whenever a payout is expected to be available in the destination account. If the payout fails, a payout.failed notification is also sent, at a later time.',
					},
					{
						name: 'Payout Updated',
						value: 'payout.updated',
						description: 'Occurs whenever a payout is updated.',
					},
					{
						name: 'Person Created',
						value: 'person.created',
						description: 'Occurs whenever a person associated with an account is created.',
					},
					{
						name: 'Person Deleted',
						value: 'person.deleted',
						description: 'Occurs whenever a person associated with an account is deleted.',
					},
					{
						name: 'Person Updated',
						value: 'person.updated',
						description: 'Occurs whenever a person associated with an account is updated.',
					},
					{
						name: 'Plan Created',
						value: 'plan.created',
						description: 'Occurs whenever a plan is created.',
					},
					{
						name: 'Plan Deleted',
						value: 'plan.deleted',
						description: 'Occurs whenever a plan is deleted.',
					},
					{
						name: 'Plan Updated',
						value: 'plan.updated',
						description: 'Occurs whenever a plan is updated.',
					},
					{
						name: 'Product Created',
						value: 'product.created',
						description: 'Occurs whenever a product is created.',
					},
					{
						name: 'Product Deleted',
						value: 'product.deleted',
						description: 'Occurs whenever a product is deleted.',
					},
					{
						name: 'Product Updated',
						value: 'product.updated',
						description: 'Occurs whenever a product is updated.',
					},
					{
						name: 'Radar Early_fraud_warning.created',
						value: 'radar.early_fraud_warning.created',
						description: 'Occurs whenever an early fraud warning is created.',
					},
					{
						name: 'Radar Early_fraud_warning.updated',
						value: 'radar.early_fraud_warning.updated',
						description: 'Occurs whenever an early fraud warning is updated.',
					},
					{
						name: 'Recipient Created',
						value: 'recipient.created',
						description: 'Occurs whenever a recipient is created.',
					},
					{
						name: 'Recipient Deleted',
						value: 'recipient.deleted',
						description: 'Occurs whenever a recipient is deleted.',
					},
					{
						name: 'Recipient Updated',
						value: 'recipient.updated',
						description: 'Occurs whenever a recipient is updated.',
					},
					{
						name: 'Reporting Report_run.failed',
						value: 'reporting.report_run.failed',
						description: 'Occurs whenever a requested **ReportRun** failed to complete.',
					},
					{
						name: 'Reporting Report_run.succeeded',
						value: 'reporting.report_run.succeeded',
						description: 'Occurs whenever a requested **ReportRun** completed succesfully.',
					},
					{
						name: 'Reporting Report_type.updated',
						value: 'reporting.report_type.updated',
						description:
							"Occurs whenever a **ReportType** is updated (typically to indicate that a new day's data has come available).",
					},
					{
						name: 'Review Closed',
						value: 'review.closed',
						description:
							"Occurs whenever a review is closed. The review's reason field indicates why: approved, disputed, refunded, or refunded_as_fraud.",
					},
					{
						name: 'Review Opened',
						value: 'review.opened',
						description: 'Occurs whenever a review is opened.',
					},
					{
						name: 'Setup Intent.canceled',
						value: 'setup_intent.canceled',
						description: 'Occurs when a SetupIntent is canceled.',
					},
					{
						name: 'Setup Intent.created',
						value: 'setup_intent.created',
						description: 'Occurs when a new SetupIntent is created.',
					},
					{
						name: 'Setup Intent.setup_failed',
						value: 'setup_intent.setup_failed',
						description:
							'Occurs when a SetupIntent has failed the attempt to setup a payment method.',
					},
					{
						name: 'Setup Intent.succeeded',
						value: 'setup_intent.succeeded',
						description: 'Occurs when an SetupIntent has successfully setup a payment method.',
					},
					{
						name: 'Sigma Scheduled_query_run.created',
						value: 'sigma.scheduled_query_run.created',
						description: 'Occurs whenever a Sigma scheduled query run finishes.',
					},
					{
						name: 'Sku Created',
						value: 'sku.created',
						description: 'Occurs whenever a SKU is created.',
					},
					{
						name: 'Sku Deleted',
						value: 'sku.deleted',
						description: 'Occurs whenever a SKU is deleted.',
					},
					{
						name: 'Sku Updated',
						value: 'sku.updated',
						description: 'Occurs whenever a SKU is updated.',
					},
					{
						name: 'Source Canceled',
						value: 'source.canceled',
						description: 'Occurs whenever a source is canceled.',
					},
					{
						name: 'Source Chargeable',
						value: 'source.chargeable',
						description: 'Occurs whenever a source transitions to chargeable.',
					},
					{
						name: 'Source Failed',
						value: 'source.failed',
						description: 'Occurs whenever a source fails.',
					},
					{
						name: 'Source Mandate_notification',
						value: 'source.mandate_notification',
						description: 'Occurs whenever a source mandate notification method is set to manual.',
					},
					{
						name: 'Source Refund_attributes_required',
						value: 'source.refund_attributes_required',
						description:
							'Occurs whenever the refund attributes are required on a receiver source to process a refund or a mispayment.',
					},
					{
						name: 'Source Transaction.created',
						value: 'source.transaction.created',
						description: 'Occurs whenever a source transaction is created.',
					},
					{
						name: 'Source Transaction.updated',
						value: 'source.transaction.updated',
						description: 'Occurs whenever a source transaction is updated.',
					},
					{
						name: 'Subscription Schedule.aborted',
						value: 'subscription_schedule.aborted',
						description:
							'Occurs whenever a subscription schedule is canceled due to the underlying subscription being canceled because of delinquency.',
					},
					{
						name: 'Subscription Schedule.canceled',
						value: 'subscription_schedule.canceled',
						description: 'Occurs whenever a subscription schedule is canceled.',
					},
					{
						name: 'Subscription Schedule.completed',
						value: 'subscription_schedule.completed',
						description: 'Occurs whenever a new subscription schedule is completed.',
					},
					{
						name: 'Subscription Schedule.created',
						value: 'subscription_schedule.created',
						description: 'Occurs whenever a new subscription schedule is created.',
					},
					{
						name: 'Subscription Schedule.expiring',
						value: 'subscription_schedule.expiring',
						description: 'Occurs 7 days before a subscription schedule will expire.',
					},
					{
						name: 'Subscription Schedule.released',
						value: 'subscription_schedule.released',
						description: 'Occurs whenever a new subscription schedule is released.',
					},
					{
						name: 'Subscription Schedule.updated',
						value: 'subscription_schedule.updated',
						description: 'Occurs whenever a subscription schedule is updated.',
					},
					{
						name: 'Tax Rate.created',
						value: 'tax_rate.created',
						description: 'Occurs whenever a new tax rate is created.',
					},
					{
						name: 'Tax Rate.updated',
						value: 'tax_rate.updated',
						description: 'Occurs whenever a tax rate is updated.',
					},
					{
						name: 'Topup Canceled',
						value: 'topup.canceled',
						description: 'Occurs whenever a top-up is canceled.',
					},
					{
						name: 'Topup Created',
						value: 'topup.created',
						description: 'Occurs whenever a top-up is created.',
					},
					{
						name: 'Topup Failed',
						value: 'topup.failed',
						description: 'Occurs whenever a top-up fails.',
					},
					{
						name: 'Topup Reversed',
						value: 'topup.reversed',
						description: 'Occurs whenever a top-up is reversed.',
					},
					{
						name: 'Topup Succeeded',
						value: 'topup.succeeded',
						description: 'Occurs whenever a top-up succeeds.',
					},
					{
						name: 'Transfer Created',
						value: 'transfer.created',
						description: 'Occurs whenever a transfer is created.',
					},
					{
						name: 'Transfer Failed',
						value: 'transfer.failed',
						description: 'Occurs whenever a transfer failed.',
					},
					{
						name: 'Transfer Paid',
						value: 'transfer.paid',
						description:
							'Occurs after a transfer is paid. For Instant Payouts, the event will be sent on the next business day, although the funds should be received well beforehand.',
					},
					{
						name: 'Transfer Reversed',
						value: 'transfer.reversed',
						description: 'Occurs whenever a transfer is reversed, including partial reversals.',
					},
					{
						name: 'Transfer Updated',
						value: 'transfer.updated',
						description: "Occurs whenever a transfer's description or metadata is updated.",
					},
				],
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId === undefined) {
					// No webhook id is set so no webhook can exist
					return false;
				}

				// Webhook got created before so check if it still exists
				const endpoint = `/webhook_endpoints/${webhookData.webhookId}`;

				try {
					await stripeApiRequest.call(this, 'GET', endpoint, {});
				} catch (error) {
					if (error.httpCode === '404' || error.message.includes('resource_missing')) {
						// Webhook does not exist
						delete webhookData.webhookId;
						delete webhookData.webhookEvents;
						delete webhookData.webhookSecret;

						return false;
					}

					// Some error occured
					throw error;
				}

				// If it did not error then the webhook exists
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const events = this.getNodeParameter('events', []);

				const endpoint = '/webhook_endpoints';

				const body = {
					url: webhookUrl,
					enabled_events: events,
				};

				let responseData;
				try {
					responseData = await stripeApiRequest.call(this, 'POST', endpoint, body);
				} catch (error) {
					throw error;
				}

				if (
					responseData.id === undefined ||
					responseData.secret === undefined ||
					responseData.status !== 'enabled'
				) {
					// Required data is missing so was not successful
					throw new NodeApiError(this.getNode(), responseData, {
						message: 'Stripe webhook creation response did not contain the expected data.',
					});
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = responseData.id as string;
				webhookData.webhookEvents = responseData.enabled_events as string[];
				webhookData.webhookSecret = responseData.secret as string;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					const endpoint = `/webhook_endpoints/${webhookData.webhookId}`;
					const body = {};

					try {
						await stripeApiRequest.call(this, 'DELETE', endpoint, body);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
					delete webhookData.webhookId;
					delete webhookData.webhookEvents;
					delete webhookData.webhookSecret;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as IDataObject;
		const req = this.getRequestObject();

		const events = this.getNodeParameter('events', []) as string[];

		const eventType = bodyData.type as string | undefined;

		if (eventType === undefined || (!events.includes('*') && !events.includes(eventType))) {
			// If not eventType is defined or when one is defined but we are not
			// listening to it do not start the workflow.
			return {};
		}

		return {
			workflowData: [this.helpers.returnJsonArray(req.body)],
		};
	}
}
