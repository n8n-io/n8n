import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import { couponFields, couponOperations } from './CouponDescription';
import { paddleApiRequest, validateJSON } from './GenericFunctions';
import { paymentsFields, paymentsOperations } from './PaymentDescription';
import { planFields, planOperations } from './PlanDescription';
import { productFields, productOperations } from './ProductDescription';
import { userFields, userOperations } from './UserDescription';

import moment = require('moment');
import { orderOperations, orderFields } from './OrderDescription';

export class Paddle implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Paddle',
		name: 'paddle',
		icon: 'file:paddle.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Paddle API',
		defaults: {
			name: 'Paddle',
			color: '#45567c',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'paddleApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Coupon',
						value: 'coupon',
					},
					{
						name: 'Payments',
						value: 'payments',
					},
					{
						name: 'Plan',
						value: 'plan',
					},
					{
						name: 'Product',
						value: 'product',
					},
					{
						name: 'Order',
						value: 'order',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'coupon',
				description: 'Resource to consume.',
			},
			// COUPON
			...couponOperations,
			...couponFields,
			// PAYMENT
			...paymentsOperations,
			...paymentsFields,
			// PLAN
			...planOperations,
			...planFields,
			// PRODUCT
			...productOperations,
			...productFields,
			// ORDER
			...orderOperations,
			...orderFields,
			// USER
			...userOperations,
			...userFields
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const body: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'coupon') {
				if (operation === 'create') {
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '') {
							if (validateJSON(additionalFieldsJson) !== undefined) {
								Object.assign(body, JSON.parse(additionalFieldsJson));
							} else {
								throw new Error('Additional fields must be a valid JSON');
							}
						}

					} else {

						const discountType = this.getNodeParameter('discountType', i) as string;
						const couponType = this.getNodeParameter('couponType', i) as string;
						const discountAmount = this.getNodeParameter('discountAmount', i) as number;
						const currency = this.getNodeParameter('currency', i) as string;

						if (couponType === 'product') {
							body.product_ids = this.getNodeParameter('productIds', i) as string;
						}

						body.coupon_type = couponType;
						body.discount_type = discountType;
						body.discount_amount = discountAmount;
						body.currency = currency;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.allowedUses) {
							body.allowed_uses = additionalFields.allowedUses as number;
						}
						if (additionalFields.couponCode) {
							body.coupon_code = additionalFields.couponCode as string;
						}
						if (additionalFields.couponPrefix) {
							body.coupon_prefix = additionalFields.couponPrefix as string;
						}
						if (additionalFields.expires) {
							body.expires = moment(additionalFields.expires as Date).format('YYYY-MM-DD') as string;
						}
						if (additionalFields.group) {
							body.group = additionalFields.group as string;
						}
						if (additionalFields.recurring) {
							body.recurring = 1;
						} else {
							body.recurring = 0;
						}
						if (additionalFields.numberOfCoupons) {
							body.num_coupons = additionalFields.numberOfCoupons as number;
						}
						if (additionalFields.description) {
							body.description = additionalFields.description as string;
						}

						const endpoint = '/2.1/product/create_coupon';

						responseData = await paddleApiRequest.call(this, endpoint, 'POST', body);
					}
				}

				if (operation === 'getAll') {
					const productIds = this.getNodeParameter('productId', i) as string;
					const endpoint = '/2.0/product/list_coupons';

					body.product_id = productIds as string;

					responseData = await paddleApiRequest.call(this, endpoint, 'POST', body);
				}

				if (operation === 'update') {

					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '') {
							if (validateJSON(additionalFieldsJson) !== undefined) {
								Object.assign(body, JSON.parse(additionalFieldsJson));
							} else {
								throw new Error('Additional fields must be a valid JSON');
							}
						}

					} else {
						const updateBy = this.getNodeParameter('updateBy', i) as string;

						if (updateBy === 'group') {
							body.group = this.getNodeParameter('group', i) as string;
						} else {
							body.coupon_code = this.getNodeParameter('couponCode', i) as string;
						}

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.allowedUses) {
							body.allowed_uses = additionalFields.allowedUses as number;
						}
						if (additionalFields.currency) {
							body.currency = additionalFields.currency as string;
						}
						if (additionalFields.newCouponCode) {
							body.new_coupon_code = additionalFields.newCouponCode as string;
						}
						if (additionalFields.expires) {
							body.expires = moment(additionalFields.expires as Date).format('YYYY-MM-DD') as string;
						}
						if (additionalFields.newGroup) {
							body.new_group = additionalFields.newGroup as string;
						}
						if (additionalFields.recurring) {
							body.recurring = 1;
						} else {
							body.recurring = 0;
						}
						if (additionalFields.productIds) {
							body.product_ids = additionalFields.productIds as number;
						}
						if (additionalFields.discountAmount) {
							body.discount_amount = additionalFields.discountAmount as number;
						}
					}

					const endpoint = '/2.1/product/update_coupon';

					responseData = await paddleApiRequest.call(this, endpoint, 'POST', body);
				}
			}
			if (resource === 'payment') {
				if (operation === 'getAll') {
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '') {
							if (validateJSON(additionalFieldsJson) !== undefined) {
								Object.assign(body, JSON.parse(additionalFieldsJson));
							} else {
								throw new Error('Additional fields must be a valid JSON');
							}
						}

					} else {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.subscriptionId) {
							body.subscription_id = additionalFields.subscriptionId as number;
						}
						if (additionalFields.plan) {
							body.plan = additionalFields.plan as string;
						}
						if (additionalFields.state) {
							body.state = additionalFields.state as string;
						}
						if (additionalFields.recurring) {
							body.recurring = 1;
						} else {
							body.recurring = 0;
						}
						if (additionalFields.from) {
							body.from = moment(additionalFields.from as Date).format('YYYY-MM-DD') as string;
						}
						if (additionalFields.to) {
							body.to = moment(additionalFields.to as Date).format('YYYY-MM-DD') as string;
						}
						if (additionalFields.isOneOffCharge) {
							body.is_one_off_charge = additionalFields.isOneOffCharge as boolean;
						}
					}

					const endpoint = '/2.0/subscription/payments';

					responseData = await paddleApiRequest.call(this, endpoint, 'POST', body);
				}
				if (operation === 'reschedule') {
					const paymentId = this.getNodeParameter('paymentId', i) as number;
					const date = this.getNodeParameter('date', i) as Date;

					body.payment_id = paymentId;
					body.date = body.to = moment(date as Date).format('YYYY-MM-DD') as string;

					const endpoint = '/2.0/subscription/payments_reschedule';

					responseData = await paddleApiRequest.call(this, endpoint, 'POST', body);
				}
			}
			if (resource === 'plan') {
				if (operation === 'getAll') {
					const endpoint = '/2.0/subscription/plans';

					responseData = await paddleApiRequest.call(this, endpoint, 'POST', body);
				}
				if (operation === 'get') {
					const planId = this.getNodeParameter('planId', i) as string;

					body.plan = planId;

					const endpoint = '/2.0/subscription/plans';

					responseData = await paddleApiRequest.call(this, endpoint, 'POST', body);
				}
			}
			if (resource === 'product') {
				if (operation === 'getAll') {
					const endpoint = '/2.0/product/get_products';

					responseData = await paddleApiRequest.call(this, endpoint, 'POST', body);
				}
			}
			if (resource === 'order') {
				if (operation === 'get') {
					const endpoint = '/1.0/order';
					const checkoutId = this.getNodeParameter('checkoutId', i) as string;

					body.checkout_id = checkoutId;

					responseData = await paddleApiRequest.call(this, endpoint, 'GET', body);
				}
			}
			if (resource === 'user') {
				if (operation === 'getAll') {

					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '') {
							if (validateJSON(additionalFieldsJson) !== undefined) {
								Object.assign(body, JSON.parse(additionalFieldsJson));
							} else {
								throw new Error('Additional fields must be a valid JSON');
							}
						}

					} else {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (!returnAll) {
							body.results_per_page = this.getNodeParameter('limit', i) as number;
						}

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.state) {
							body.state = additionalFields.state as string;
						}
						if (additionalFields.planId) {
							body.plan_id = additionalFields.planId as string;
						}
						if (additionalFields.subscriptionId) {
							body.subscription_id = additionalFields.subscriptionId as string;
						}

					}
					const endpoint = '/2.0/subscription/users';

					responseData = await paddleApiRequest.call(this, endpoint, 'POST', body);
				}
			}

			console.log(responseData);

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as unknown as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
