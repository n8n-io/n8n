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
			async getProfiles(this: ILoadOptionsFunctions) {
				const profiles = await wiseApiRequest.call(this, 'GET', '/v1/profiles', {}, {});

				return profiles.map(({ id, type }: { id: number, type: 'business' | 'personal' }) => ({
					name: type.charAt(0).toUpperCase() + type.slice(1),
					value: id,
				}));
			},

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

							const { lineStyle } = this.getNodeParameter('additionalFields', i) as IDataObject;

							if (lineStyle !== undefined) {
								qs.type = lineStyle;
							}

							const { interval } = this.getNodeParameter('additionalFields', i) as {
								interval: {
									intervalProperties: { [key: string]: string }
								}
							};

							if (interval !== undefined) {
								qs.intervalStart = moment(interval.intervalProperties.intervalStart).format();
								qs.intervalEnd = moment(interval.intervalProperties.intervalEnd).format();
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

						// ...

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

						// ...

					} else if (operation === 'getAll') {

						// ----------------------------------
						//          profile: get
						// ----------------------------------

						// https://api-docs.transferwise.com/#user-profiles-list

						// ...

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

						// ...

					} else if (operation === 'getAll') {

						// ----------------------------------
						//          quote: get
						// ----------------------------------

						// https://api-docs.transferwise.com/#quotes-get-by-id

						// ...

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

						// ...

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
