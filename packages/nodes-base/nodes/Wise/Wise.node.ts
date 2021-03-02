import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	accountFields,
	accountOperations,
	exchangeRateFields,
	exchangeRateOperations,
	profileFields,
	profileOperations,
	quoteFields,
	quoteOperations,
	recipientFields,
	recipientOperations,
	transferFields,
	transferOperations,
} from './descriptions';

import {
	findRequiredFields,
	wiseApiRequest,
} from './GenericFunctions';

import * as moment from 'moment';

export class Wise implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wise',
		name: 'wise',
		icon: 'file:wise.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Wise API',
		defaults: {
			name: 'Wise',
			color: '#37517e',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'wiseApi',
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
						name: 'Account',
						value: 'account',
					},
					{
						name: 'Exchange Rate',
						value: 'exchangeRate',
					},
					{
						name: 'Profile',
						value: 'profile',
					},
					{
						name: 'Quote',
						value: 'quote',
					},
					{
						name: 'Recipient',
						value: 'recipient',
					},
					{
						name: 'Transfer',
						value: 'transfer',
					},
				],
				default: 'account',
				description: 'Resource to consume',
			},
			...accountOperations,
			...accountFields,
			...exchangeRateOperations,
			...exchangeRateFields,
			...profileOperations,
			...profileFields,
			...quoteOperations,
			...quoteFields,
			...recipientOperations,
			...recipientFields,
			...transferOperations,
			...transferFields,
		],
	};

	methods = {
		loadOptions: {
			async getBorderlessAccounts(this: ILoadOptionsFunctions) {
				const qs = {
					profileId: this.getNodeParameter('profileId', 0),
				};

				const accounts = await wiseApiRequest.call(this, 'GET', 'v1/borderless-accounts', qs);

				return accounts.map(({ id, balances }: { id: number, balances: Array<{ currency: string }> }) => ({
					name: balances.map(({ currency }) => currency).join(' - '),
					value: id,
				}));
			},

			async getProfiles(this: ILoadOptionsFunctions) {
				const profiles = await wiseApiRequest.call(this, 'GET', '/v1/profiles', {}, {});

				return profiles.map(({ id, type }: { id: number, type: 'business' | 'personal' }) => ({
					name: type.charAt(0).toUpperCase() + type.slice(1),
					value: id,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

			try {

				if (resource === 'account') {

					// *********************************************************************
					//                             account
					// *********************************************************************

					if (operation === 'get') {

						// ----------------------------------
						//         account: get
						// ----------------------------------

						// https://api-docs.transferwise.com/#borderless-accounts-get-account-balance
						// https://api-docs.transferwise.com/#borderless-accounts-get-available-currencies
						// https://api-docs.transferwise.com/#borderless-accounts-get-account-statement

						const details = this.getNodeParameter('details', i) as 'balances' | 'currencies' | 'statement';

						if (details === 'balances') {

							const qs = {
								profileId: this.getNodeParameter('profileId', i),
							};

							responseData = await wiseApiRequest.call(this, 'GET', 'v1/borderless-accounts', qs);

						} else if (details === 'currencies') {

							responseData = await wiseApiRequest.call(this, 'GET', 'v1/borderless-accounts/balance-currencies');

						} else if (details === 'statement') {

							const profileId = this.getNodeParameter('profileId', i);
							const borderlessAccountId = this.getNodeParameter('borderlessAccountId', i);
							const endpoint = `v3/profiles/${profileId}/borderless-accounts/${borderlessAccountId}/statement.json`;

							const qs = {
								currency: this.getNodeParameter('currency', i),
							} as IDataObject;

							const { lineStyle, range } = this.getNodeParameter('additionalFields', i) as {
								lineStyle: 'COMPACT' | 'FLAT',
								range: {
									rangeProperties: { intervalStart: string, intervalEnd: string }
								},
							};

							if (lineStyle !== undefined) {
								qs.type = lineStyle;
							}

							if (range !== undefined) {
								qs.intervalStart = moment(range.rangeProperties.intervalStart).format();
								qs.intervalEnd = moment(range.rangeProperties.intervalEnd).format();
							} else {
								qs.intervalStart = moment().subtract(1, 'months').format();
								qs.intervalEnd = moment().format();
							}

							responseData = await wiseApiRequest.call(this, 'GET', endpoint, qs);

						}

					}

				} else if (resource === 'exchangeRate') {

					// *********************************************************************
					//                             exchangeRate
					// *********************************************************************

					if (operation === 'get') {

						// ----------------------------------
						//       exchangeRate: get
						// ----------------------------------

						// https://api-docs.transferwise.com/#exchange-rates-list

						const qs = {
							source: this.getNodeParameter('source', i),
							target: this.getNodeParameter('target', i),
						} as IDataObject;

						const { interval, range, time } = this.getNodeParameter('additionalFields', i) as {
							interval: 'day' | 'hour' | 'minute',
							range: {
								rangeProperties: { from: string, to: string }
							},
							time: string,
						};

						if (interval !== undefined) {
							if (range === undefined) {
								throw new Error('Please enter a range for the interval.');
							}

							qs.group = interval;
						}

						if (range !== undefined) {
							qs.from = moment(range.rangeProperties.from).format();
							qs.to = moment(range.rangeProperties.to).format();
						} else {
							qs.from = moment().subtract(1, 'months').format();
							qs.to = moment().format();
						}

						if (time !== undefined) {
							delete qs.from;
							delete qs.to;
							qs.group = time;
						}

						responseData = await wiseApiRequest.call(this, 'GET', 'v1/rates', qs);

					}

				} else if (resource === 'profile') {

					// *********************************************************************
					//                             profile
					// *********************************************************************

					if (operation === 'get') {

						// ----------------------------------
						//          profile: get
						// ----------------------------------

						// https://api-docs.transferwise.com/#user-profiles-get-by-id

						const profileId = this.getNodeParameter('profileId', i);
						responseData = await wiseApiRequest.call(this, 'GET', `v1/profiles/${profileId}`);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//         profile: getAll
						// ----------------------------------

						// https://api-docs.transferwise.com/#user-profiles-list

						responseData = await wiseApiRequest.call(this, 'GET', 'v1/profiles');

					}

				} else if (resource === 'quote') {

					// *********************************************************************
					//                             quote
					// *********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//          quote: create
						// ----------------------------------

						// https://api-docs.transferwise.com/#quotes-create

						const body = {
							profile: this.getNodeParameter('profileId', i),
							sourceCurrency: this.getNodeParameter('sourceCurrency', i),
							targetCurrency: this.getNodeParameter('targetCurrency', i),
						} as IDataObject;

						const amountType = this.getNodeParameter('amountType', i) as 'source' | 'target';
						const amount = this.getNodeParameter('amount', i) as number;

						if (amountType === 'source') {
							body.sourceAmount = amount;
						} else if (amountType === 'target') {
							body.targetAmount = amount;
						}

						responseData = await wiseApiRequest.call(this, 'POST', 'v2/quotes', {}, body);

					} else if (operation === 'get') {

						// ----------------------------------
						//          quote: get
						// ----------------------------------

						// https://api-docs.transferwise.com/#quotes-get-by-id

						const quoteId = this.getNodeParameter('quoteId', i);
						responseData = await wiseApiRequest.call(this, 'GET', `v2/quotes/${quoteId}`);

					}

				} else if (resource === 'recipient') {

					// *********************************************************************
					//                             recipient
					// *********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//       recipient: create
						// ----------------------------------

						// https://api-docs.transferwise.com/#recipient-accounts-create

						const requiredFields = await findRequiredFields.call(this, i);

						console.log(JSON.stringify(requiredFields, null, 2));

						responseData = [];

						// const body = {
						// 	accountHolderName: this.getNodeParameter('accountHolderName', i),
						// 	currency: this.getNodeParameter('currency', i),
						// 	ownedByCustomer: this.getNodeParameter('ownedByCustomer', i),
						// 	// type: this.getNodeParameter('type', i),
						// 	// profile: this.getNodeParameter('profileId', i),
						// 	details: {
						// 		// legalType: this.getNodeParameter('legalType', i),
						// 		// accountNumber: this.getNodeParameter('accountNumber', i),
						// 	},
						// } as IDataObject;

						// responseData = await wiseApiRequest.call(this, 'POST', 'v2/accounts', {}, body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//        recipient: delete
						// ----------------------------------

						// https://api-docs.transferwise.com/#recipient-accounts-delete

						// ...

					} else if (operation === 'get') {

						// ----------------------------------
						//        recipient: get
						// ----------------------------------

						// https://api-docs.transferwise.com/#recipient-accounts-get-by-id

						// ...

					} else if (operation === 'getAll') {

						// ----------------------------------
						//        recipient: getAll
						// ----------------------------------

						// https://api-docs.transferwise.com/#recipient-accounts-list

						// ...

					}

				} else if (resource === 'transfer') {

					// *********************************************************************
					//                             transfer
					// *********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//         transfer: create
						// ----------------------------------

						// ...

					} else if (operation === 'delete') {

						// ----------------------------------
						//        transfer: delete
						// ----------------------------------

						// ...

					} else if (operation === 'get') {

						// ----------------------------------
						//        transfer: get
						// ----------------------------------

						// ...

					} else if (operation === 'getAll') {

						// ----------------------------------
						//        transfer: getAll
						// ----------------------------------

						// ...

					}

				}

			} catch (error) {
				if (this.continueOnFail()) {
					// TODO
					returnData.push({ error: error.error.error.message });
					continue;
				}

				throw error;
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
