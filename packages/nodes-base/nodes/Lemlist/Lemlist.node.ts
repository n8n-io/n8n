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
	activityFields,
	activityOperations,
	campaignFields,
	campaignOperations,
	leadFields,
	leadOperations,
	teamFields,
	teamOperations,
	unsubscribeFields,
	unsubscribeOperations,
} from './descriptions';

import {
	lemlistApiRequest,
} from './GenericFunctions';

import {
	isEmpty,
} from 'lodash';

export class Lemlist implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lemlist',
		name: 'lemlist',
		icon: 'file:lemlist.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Lemlist API',
		defaults: {
			name: 'Lemlist',
			color: '#4d19ff',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'lemlistApi',
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
						name: 'Activity',
						value: 'activity',
					},
					{
						name: 'Campaign',
						value: 'campaign',
					},
					{
						name: 'Lead',
						value: 'lead',
					},
					{
						name: 'Team',
						value: 'team',
					},
					{
						name: 'Unsubscribe',
						value: 'unsubscribe',
					},
				],
				default: 'activity',
				description: 'Resource to consume',
			},
			...activityOperations,
			...activityFields,
			...campaignOperations,
			...campaignFields,
			...leadOperations,
			...leadFields,
			...teamOperations,
			...teamFields,
			...unsubscribeOperations,
			...unsubscribeFields,
		],
	};

	// methods = {
	// 	loadOptions: {
	// 		async getBorderlessAccounts(this: ILoadOptionsFunctions) {
	// 			const qs = {
	// 				profileId: this.getNodeParameter('profileId', 0),
	// 			};

	// 			const accounts = await wiseApiRequest.call(this, 'GET', 'v1/borderless-accounts', qs);

	// 			return accounts.map(({ id, balances }: BorderlessAccount ) => ({
	// 				name: balances.map(({ currency }) => currency).join(' - '),
	// 				value: id,
	// 			}));
	// 		},

	// 		async getProfiles(this: ILoadOptionsFunctions) {
	// 			const profiles = await wiseApiRequest.call(this, 'GET', 'v1/profiles');

	// 			return profiles.map(({ id, type }: Profile) => ({
	// 				name: type.charAt(0).toUpperCase() + type.slice(1),
	// 				value: id,
	// 			}));
	// 		},

	// 		async getRecipients(this: ILoadOptionsFunctions) {
	// 			const qs = {
	// 				profileId: this.getNodeParameter('profileId', 0),
	// 			};

	// 			const recipients = await wiseApiRequest.call(this, 'GET', 'v1/accounts', qs);

	// 			return recipients.map(({ id, accountHolderName }: Recipient) => ({
	// 				name: accountHolderName,
	// 				value: id,
	// 			}));
	// 		},
	// 	},
	// };

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

			try {

				if (resource === 'activity') {

					// *********************************************************************
					//                             activity
					// *********************************************************************

					if (operation === 'get') {

						// ----------------------------------
						//        activity: getAll
						// ----------------------------------

						// https://developer.lemlist.com/#activities

						const qs = {} as IDataObject;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (!isEmpty(additionalFields)) {
							Object.assign(qs, additionalFields);
						}

						responseData = await lemlistApiRequest.call(this, 'GET', 'activities', qs);

					}

				} else if (resource === 'campaign') {

					// *********************************************************************
					//                             campaign
					// *********************************************************************

					if (operation === 'getAll') {

						// ----------------------------------
						//        campaign: getAll
						// ----------------------------------

						// https://developer.lemlist.com/#list-all-campaigns

						const { csvExport } = this.getNodeParameter('additionalFields', i) as { csvExport: boolean };

						if (csvExport) {

							const campaignId = this.getNodeParameter('campaignId', i);
							responseData = await lemlistApiRequest.call(this, 'GET', `campaigns/${campaignId}/export`);

						} else {

							responseData = await lemlistApiRequest.call(this, 'GET', 'campaigns');
							console.log(responseData);
							const returnAll = this.getNodeParameter('returnAll', i);
							if (!returnAll) {
								const limit = this.getNodeParameter('limit', i);
								responseData = responseData.slice(0, limit);
							}

						}

					}

				} else if (resource === 'lead') {

					// *********************************************************************
					//                             lead
					// *********************************************************************

					if (operation === 'get') {

						// ----------------------------------
						//          lead: create
						// ----------------------------------

						// https://developer.lemlist.com/#add-a-lead-in-a-campaign

						const qs = {} as IDataObject;
						const { deduplicate } = this.getNodeParameter('additionalFields', i) as { deduplicate: boolean };

						if (deduplicate !== undefined) {
							qs.deduplicate = deduplicate;
						}

						const body = {} as IDataObject;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (!isEmpty(additionalFields)) {
							Object.assign(body, additionalFields);
						}

						const campaignId = this.getNodeParameter('campaignId', i);
						const email = this.getNodeParameter('email', i);
						const endpoint = `campaigns/${campaignId}/leads/${email}`;
						responseData = await lemlistApiRequest.call(this, 'POST', endpoint, qs, body);

					} else if (operation === 'delete') {

						// ----------------------------------
						//         lead: delete
						// ----------------------------------

						// https://developer.lemlist.com/#delete-a-lead-from-a-campaign

						const campaignId = this.getNodeParameter('campaignId', i);
						const email = this.getNodeParameter('email', i);
						const endpoint = `campaigns/${campaignId}/leads/${email}`;
						responseData = await lemlistApiRequest.call(this, 'DELETE', endpoint, { action: 'remove' });

					} else if (operation === 'get') {

						// ----------------------------------
						//         lead: get
						// ----------------------------------

						// https://developer.lemlist.com/#get-a-specific-lead-by-email

						const email = this.getNodeParameter('email', i);
						responseData = await lemlistApiRequest.call(this, 'GET', `leads/${email}`);

					} else if (operation === 'unsubscribe') {

						// ----------------------------------
						//         lead: unsubscribe
						// ----------------------------------

						// https://developer.lemlist.com/#unsubscribe-a-lead-from-a-campaign

						const campaignId = this.getNodeParameter('campaignId', i);
						const email = this.getNodeParameter('email', i);
						const endpoint = `campaigns/${campaignId}/leads/${email}`;
						responseData = await lemlistApiRequest.call(this, 'DELETE', endpoint);

					}

				} else if (resource === 'team') {

					// *********************************************************************
					//                             team
					// *********************************************************************

					if (operation === 'get') {

						// ----------------------------------
						//         team: get
						// ----------------------------------

						// https://developer.lemlist.com/#team

						responseData = await lemlistApiRequest.call(this, 'GET', 'team');

					}

				} else if (resource === 'unsubscribe') {

					// *********************************************************************
					//                             unsubscribe
					// *********************************************************************

					if (operation === 'create') {

						// ----------------------------------
						//        unsubscribe: create
						// ----------------------------------

						// https://developer.lemlist.com/#add-an-email-address-in-the-unsubscribes

						const email = this.getNodeParameter('email', i);
						responseData = await lemlistApiRequest.call(this, 'POST', `unsubscribes/${email}`);

					} else if (operation === 'delete') {

						// ----------------------------------
						//        unsubscribe: delete
						// ----------------------------------

						// https://developer.lemlist.com/#delete-an-email-address-from-the-unsubscribes

						const email = this.getNodeParameter('email', i);
						responseData = await lemlistApiRequest.call(this, 'DELETE', `unsubscribes/${email}`);

					} else if (operation === 'getAll') {

						// ----------------------------------
						//        unsubscribe: getAll
						// ----------------------------------

						// https://developer.lemlist.com/#list-all-unsubscribes

						responseData = await lemlistApiRequest.call(this, 'GET', 'unsubscribes');

						// TODO returnall / limit

					}

				}

			} catch (error) {
				if (this.continueOnFail()) {
					// TODO
					returnData.push({ error: 'TODO' });
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
