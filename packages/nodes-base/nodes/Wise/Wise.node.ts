import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import omit from 'lodash/omit';
import moment from 'moment-timezone';
import { v4 as uuid } from 'uuid';
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

import type {
	BorderlessAccount,
	ExchangeRateAdditionalFields,
	Profile,
	Recipient,
	StatementAdditionalFields,
	TransferFilters,
} from './GenericFunctions';
import { wiseApiRequest } from './GenericFunctions';

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
				noDataExpression: true,
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

				const accounts = await wiseApiRequest.call(this, 'GET', 'v1/borderless-accounts', {}, qs);

				return accounts.map(({ id, balances }: BorderlessAccount) => ({
					name: balances.map(({ currency }) => currency).join(' - '),
					value: id,
				}));
			},

			async getProfiles(this: ILoadOptionsFunctions) {
				const profiles = await wiseApiRequest.call(this, 'GET', 'v1/profiles');

				return profiles.map(({ id, type }: Profile) => ({
					name: type.charAt(0).toUpperCase() + type.slice(1),
					value: id,
				}));
			},

			async getRecipients(this: ILoadOptionsFunctions) {
				const qs = {
					profileId: this.getNodeParameter('profileId', 0),
				};

				const recipients = (await wiseApiRequest.call(
					this,
					'GET',
					'v1/accounts',
					{},
					qs,
				)) as Recipient[];

				return recipients.reduce<INodePropertyOptions[]>(
					(activeRecipients, { active, id, accountHolderName, currency, country, type }) => {
						if (active) {
							const recipient = {
								name: `[${currency}] ${accountHolderName} - (${
									country !== null ? country + ' - ' : ''
								}${type})`,
								value: id,
							};
							activeRecipients.push(recipient);
						}
						return activeRecipients;
					},
					[],
				);
			},
		},
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		const timezone = this.getTimezone();

		let responseData;
		const returnData: IDataObject[] = [];
		let binaryOutput = false;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'account') {
					// *********************************************************************
					//                             account
					// *********************************************************************

					if (operation === 'getBalances') {
						// ----------------------------------
						//      account: getBalances
						// ----------------------------------

						// https://api-docs.transferwise.com/#borderless-accounts-get-account-balance

						const qs = {
							profileId: this.getNodeParameter('profileId', i),
						};

						responseData = await wiseApiRequest.call(this, 'GET', 'v1/borderless-accounts', {}, qs);
					} else if (operation === 'getCurrencies') {
						// ----------------------------------
						//      account: getCurrencies
						// ----------------------------------

						// https://api-docs.transferwise.com/#borderless-accounts-get-available-currencies

						responseData = await wiseApiRequest.call(
							this,
							'GET',
							'v1/borderless-accounts/balance-currencies',
						);
					} else if (operation === 'getStatement') {
						// ----------------------------------
						//      account: getStatement
						// ----------------------------------

						// https://api-docs.transferwise.com/#borderless-accounts-get-account-statement

						const profileId = this.getNodeParameter('profileId', i);
						const borderlessAccountId = this.getNodeParameter('borderlessAccountId', i);
						const format = this.getNodeParameter('format', i) as 'json' | 'csv' | 'pdf' | 'xml';
						const endpoint = `v3/profiles/${profileId}/borderless-accounts/${borderlessAccountId}/statement.${format}`;

						const qs = {
							currency: this.getNodeParameter('currency', i),
						} as IDataObject;

						const { lineStyle, range } = this.getNodeParameter(
							'additionalFields',
							i,
						) as StatementAdditionalFields;

						if (lineStyle !== undefined) {
							qs.type = lineStyle;
						}

						if (range !== undefined) {
							qs.intervalStart = moment
								.tz(range.rangeProperties.intervalStart, timezone)
								.utc()
								.format();
							qs.intervalEnd = moment
								.tz(range.rangeProperties.intervalEnd, timezone)
								.utc()
								.format();
						} else {
							qs.intervalStart = moment().subtract(1, 'months').utc().format();
							qs.intervalEnd = moment().utc().format();
						}

						if (format === 'json') {
							responseData = await wiseApiRequest.call(this, 'GET', endpoint, {}, qs);
						} else {
							const data = await wiseApiRequest.call(this, 'GET', endpoint, {}, qs, {
								encoding: 'arraybuffer',
							});
							const binaryProperty = this.getNodeParameter('binaryProperty', i);

							items[i].binary = items[i].binary ?? {};
							items[i].binary![binaryProperty] = await this.helpers.prepareBinaryData(
								data as Buffer,
								this.getNodeParameter('fileName', i) as string,
							);

							responseData = items;
							binaryOutput = true;
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

						const { interval, range, time } = this.getNodeParameter(
							'additionalFields',
							i,
						) as ExchangeRateAdditionalFields;

						if (interval !== undefined) {
							qs.group = interval;
						}

						if (time !== undefined) {
							qs.time = time;
						}

						if (range !== undefined && time === undefined) {
							qs.from = moment.tz(range.rangeProperties.from, timezone).utc().format();
							qs.to = moment.tz(range.rangeProperties.to, timezone).utc().format();
						} else if (time === undefined) {
							qs.from = moment().subtract(1, 'months').utc().format();
							qs.to = moment().format();
						}

						responseData = await wiseApiRequest.call(this, 'GET', 'v1/rates', {}, qs);
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
				} else if (resource === 'recipient') {
					// *********************************************************************
					//                             recipient
					// *********************************************************************

					if (operation === 'getAll') {
						// ----------------------------------
						//       recipient: getAll
						// ----------------------------------

						// https://api-docs.transferwise.com/#recipient-accounts-list

						responseData = await wiseApiRequest.call(this, 'GET', 'v1/accounts');

						const returnAll = this.getNodeParameter('returnAll', i);

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.slice(0, limit);
						}
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
							sourceCurrency: (this.getNodeParameter('sourceCurrency', i) as string).toUpperCase(),
							targetCurrency: (this.getNodeParameter('targetCurrency', i) as string).toUpperCase(),
						} as IDataObject;

						const amountType = this.getNodeParameter('amountType', i) as 'source' | 'target';

						if (amountType === 'source') {
							body.sourceAmount = this.getNodeParameter('amount', i);
						} else if (amountType === 'target') {
							body.targetAmount = this.getNodeParameter('amount', i);
						}

						responseData = await wiseApiRequest.call(this, 'POST', 'v2/quotes', body, {});
					} else if (operation === 'get') {
						// ----------------------------------
						//          quote: get
						// ----------------------------------

						// https://api-docs.transferwise.com/#quotes-get-by-id

						const quoteId = this.getNodeParameter('quoteId', i);
						responseData = await wiseApiRequest.call(this, 'GET', `v2/quotes/${quoteId}`);
					}
				} else if (resource === 'transfer') {
					// *********************************************************************
					//                             transfer
					// *********************************************************************

					if (operation === 'create') {
						// ----------------------------------
						//         transfer: create
						// ----------------------------------

						// https://api-docs.transferwise.com/#transfers-create

						const body = {
							quoteUuid: this.getNodeParameter('quoteId', i),
							targetAccount: this.getNodeParameter('targetAccountId', i),
							customerTransactionId: uuid(),
						} as IDataObject;

						const { reference } = this.getNodeParameter('additionalFields', i) as {
							reference: string;
						};

						if (reference !== undefined) {
							body.details = { reference };
						}

						responseData = await wiseApiRequest.call(this, 'POST', 'v1/transfers', body, {});
					} else if (operation === 'delete') {
						// ----------------------------------
						//        transfer: delete
						// ----------------------------------

						// https://api-docs.transferwise.com/#transfers-cancel

						const transferId = this.getNodeParameter('transferId', i);
						responseData = await wiseApiRequest.call(
							this,
							'PUT',
							`v1/transfers/${transferId}/cancel`,
						);
					} else if (operation === 'execute') {
						// ----------------------------------
						//        transfer: execute
						// ----------------------------------

						// https://api-docs.transferwise.com/#transfers-fund

						const profileId = this.getNodeParameter('profileId', i);
						const transferId = this.getNodeParameter('transferId', i) as string;

						const endpoint = `v3/profiles/${profileId}/transfers/${transferId}/payments`;
						responseData = await wiseApiRequest.call(
							this,
							'POST',
							endpoint,
							{ type: 'BALANCE' },
							{},
						);

						// in sandbox, simulate transfer completion so that PDF receipt can be downloaded

						const { environment } = await this.getCredentials('wiseApi');

						if (environment === 'test') {
							for (const testEndpoint of [
								'processing',
								'funds_converted',
								'outgoing_payment_sent',
							]) {
								await wiseApiRequest.call(
									this,
									'GET',
									`v1/simulation/transfers/${transferId}/${testEndpoint}`,
								);
							}
						}
					} else if (operation === 'get') {
						// ----------------------------------
						//        transfer: get
						// ----------------------------------

						const transferId = this.getNodeParameter('transferId', i);
						const downloadReceipt = this.getNodeParameter('downloadReceipt', i) as boolean;

						if (downloadReceipt) {
							// https://api-docs.transferwise.com/#transfers-get-receipt-pdf

							const data = await wiseApiRequest.call(
								this,
								'GET',
								`v1/transfers/${transferId}/receipt.pdf`,
								{},
								{},
								{ encoding: 'arraybuffer' },
							);
							const binaryProperty = this.getNodeParameter('binaryProperty', i);

							items[i].binary = items[i].binary ?? {};
							items[i].binary![binaryProperty] = await this.helpers.prepareBinaryData(
								data as Buffer,
								this.getNodeParameter('fileName', i) as string,
							);

							responseData = items;
							binaryOutput = true;
						} else {
							// https://api-docs.transferwise.com/#transfers-get-by-id

							responseData = await wiseApiRequest.call(this, 'GET', `v1/transfers/${transferId}`);
						}
					} else if (operation === 'getAll') {
						// ----------------------------------
						//        transfer: getAll
						// ----------------------------------

						// https://api-docs.transferwise.com/#transfers-list

						const qs = {
							profile: this.getNodeParameter('profileId', i),
						} as IDataObject;

						const filters = this.getNodeParameter('filters', i) as TransferFilters;

						Object.keys(omit(filters, 'range')).forEach((key) => {
							qs[key] = filters[key];
						});

						if (filters.range !== undefined) {
							qs.createdDateStart = moment(filters.range.rangeProperties.createdDateStart).format();
							qs.createdDateEnd = moment(filters.range.rangeProperties.createdDateEnd).format();
						} else {
							qs.createdDateStart = moment().subtract(1, 'months').format();
							qs.createdDateEnd = moment().format();
						}

						const returnAll = this.getNodeParameter('returnAll', i);

						if (!returnAll) {
							qs.limit = this.getNodeParameter('limit', i);
						}

						responseData = await wiseApiRequest.call(this, 'GET', 'v1/transfers', {}, qs);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.toString() });
					continue;
				}

				throw error;
			}

			Array.isArray(responseData)
				? returnData.push(...(responseData as IDataObject[]))
				: returnData.push(responseData as IDataObject);
		}

		if (binaryOutput && responseData !== undefined) {
			return [responseData as INodeExecutionData[]];
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
