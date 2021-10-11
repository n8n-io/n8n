import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	microsoftGraphSecurityApiRequest,
} from './GenericFunctions';

import {
	alertFields,
	alertOperations,
	secureScoreControlProfileFields,
	secureScoreControlProfileOperations,
	secureScoreFields,
	secureScoreOperations,
} from './descriptions';

import * as moment from 'moment-timezone';

export class MicrosoftGraphSecurity implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Graph Security',
		name: 'microsoftGraphSecurity',
		icon: 'file:microsoftGraph.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Microsoft Graph Security API',
		defaults: {
			name: 'MicrosoftGraphSecurity',
			color: '#0078d4',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'microsoftGraphSecurityOAuth2Api',
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
						name: 'Alert',
						value: 'alert',
					},
					{
						name: 'Secure Score',
						value: 'secureScore',
					},
					{
						name: 'Secure Score Control Profile',
						value: 'secureScoreControlProfile',
					},
				],
				default: 'alert',
			},
			...alertOperations,
			...alertFields,
			...secureScoreOperations,
			...secureScoreFields,
			...secureScoreControlProfileOperations,
			...secureScoreControlProfileFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const timezone = this.getTimezone();

		let responseData;

		for (let i = 0; i < items.length; i++) {

			try {

				if (resource === 'alert') {

					// **********************************************************************
					//                                 alert
					// **********************************************************************

					if (operation === 'get') {

						// ----------------------------------------
						//                alert: get
						// ----------------------------------------

						// https://docs.microsoft.com/en-us/graph/api/alert-get

						const alertId = this.getNodeParameter('alertId', i);

						responseData = await microsoftGraphSecurityApiRequest.call(this, 'GET', `/alerts/${alertId}`);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//              alert: getAll
						// ----------------------------------------

						// https://docs.microsoft.com/en-us/graph/api/alert-list

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						responseData = await microsoftGraphSecurityApiRequest.call(this, 'GET', '/alerts', {}, qs);

					} else if (operation === 'update') {

						// ----------------------------------------
						//              alert: update
						// ----------------------------------------

						// https://docs.microsoft.com/en-us/graph/api/alert-update

						const body = {
							provider: this.getNodeParameter('provider', i),
							vendor: this.getNodeParameter('vendor', i),
						} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						}

						const alertId = this.getNodeParameter('alertId', i);

						responseData = await microsoftGraphSecurityApiRequest.call(this, 'PATCH', `/alerts/${alertId}`, body);

					}

				} else if (resource === 'secureScore') {

					// **********************************************************************
					//                              secureScore
					// **********************************************************************

					if (operation === 'get') {

						// ----------------------------------------
						//             secureScore: get
						// ----------------------------------------

						// https://docs.microsoft.com/en-us/graph/api/securescore-get

						const secureScoreId = this.getNodeParameter('secureScoreId', i);

						const endpoint = `/secureScore/${secureScoreId}`;
						responseData = await microsoftGraphSecurityApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//           secureScore: getAll
						// ----------------------------------------

						// https://docs.microsoft.com/en-us/graph/api/security-list-securescores

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						responseData = await microsoftGraphSecurityApiRequest.call(this, 'GET', '/secureScores', {}, qs);
						responseData = responseData.value;

					}

				} else if (resource === 'secureScoreControlProfile') {

					// **********************************************************************
					//                       secureScoreControlProfile
					// **********************************************************************

					if (operation === 'get') {

						// ----------------------------------------
						//      secureScoreControlProfile: get
						// ----------------------------------------

						// https://docs.microsoft.com/en-us/graph/api/securescorecontrolprofile-get

						const secureScoreControlProfileId = this.getNodeParameter('secureScoreControlProfileId', i);
						const endpoint = `/secureScoreControlProfiles/${secureScoreControlProfileId}`;
						responseData = await microsoftGraphSecurityApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//    secureScoreControlProfile: getAll
						// ----------------------------------------

						// https://docs.microsoft.com/en-us/graph/api/security-list-securescorecontrolprofiles

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

						if (!returnAll) {
							qs.$top = this.getNodeParameter('limit', 0);
						}

						const endpoint = '/secureScoreControlProfiles';
						responseData = await microsoftGraphSecurityApiRequest.call(this, 'GET', endpoint, {}, qs);
						responseData = responseData.value;

					} else if (operation === 'update') {

						// ----------------------------------------
						//    secureScoreControlProfile: update
						// ----------------------------------------

						// https://docs.microsoft.com/en-us/graph/api/securescorecontrolprofile-update

						const body = {
							vendorInformation: {
								provider: this.getNodeParameter('provider', i),
								vendor: this.getNodeParameter('vendor', i),
							},
						} as IDataObject;

						const { closedDateTime, ...rest } = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(rest).length) {
							Object.assign(body, rest);
						}

						if (closedDateTime) {
							body.closedDateTime = moment.tz(closedDateTime, timezone).format();
						}

						const secureScoreControlProfileId = this.getNodeParameter('secureScoreControlProfileId', i);
						const endpoint = `/secureScoreControlProfiles/${secureScoreControlProfileId}`;
						const headers = { Prefer: 'return=representation' };

						responseData = await microsoftGraphSecurityApiRequest.call(this, 'PATCH', endpoint, body, headers);

					}

				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
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