import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	attendeeFields,
	attendeeOperations,
	coorganizerFields,
	coorganizerOperations,
	panelistFields,
	panelistOperations,
	registrantFields,
	registrantOperations,
	sessionFields,
	sessionOperations,
	webinarFields,
	webinarOperations,
} from './descriptions';

import {
	goToWebinarApiRequest,
	goToWebinarApiRequestAllItems,
} from './GenericFunctions';

import {
	isEmpty,
	omit,
} from 'lodash';

export class GoToWebinar implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GoToWebinar',
		name: 'GoToWebinar',
		icon: 'file:gotowebinar.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the GoToWebinar API',
		defaults: {
			name: 'GoToWebinar',
			color: '#0097e1',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'goToWebinarOAuth2Api',
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
						name: 'Attendee',
						value: 'attendee',
					},
					{
						name: 'Coorganizer',
						value: 'coorganizer',
					},
					{
						name: 'Panelist',
						value: 'panelist',
					},
					{
						name: 'Registrant',
						value: 'registrant',
					},
					{
						name: 'Session',
						value: 'session',
					},
					{
						name: 'Webinar',
						value: 'webinar',
					},
				],
				default: 'attendee',
				description: 'Resource to consume',
			},
			...attendeeOperations,
			...attendeeFields,
			...coorganizerOperations,
			...coorganizerFields,
			...panelistOperations,
			...panelistFields,
			...registrantOperations,
			...registrantFields,
			...sessionOperations,
			...sessionFields,
			...webinarOperations,
			...webinarFields,
		],
	};

	methods = {
		loadOptions: {
			// async getCustomers(this: ILoadOptionsFunctions) {
			// 	return await loadResource.call(this, 'customer');
			// },

			// async getVendors(this: ILoadOptionsFunctions) {
			// 	return await loadResource.call(this, 'vendor');
			// },

			// async getItems(this: ILoadOptionsFunctions) {
			// 	return await loadResource.call(this, 'item');
			// },
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		const { oauthTokenData } = this.getCredentials('goToWebinarOAuth2Api') as {
			oauthTokenData: { account_key: string, organizer_key: string }
		};

		const accountKey = oauthTokenData.account_key;
		const organizerKey = oauthTokenData.organizer_key;

		for (let i = 0; i < items.length; i++) {

			if (resource === 'attendee')	{

				// *********************************************************************
				// 															  attendee
				// *********************************************************************

				// https://developer.goto.com/GoToWebinarV2/#tag/Attendees

				if (operation === 'get') {

					// ----------------------------------
					//         attendee: get
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;
					const sessionKey = this.getNodeParameter('sessionKey', i) as string;
					const registrantKey = this.getNodeParameter('registrantKey', i) as string;

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/attendees/${registrantKey}`;
					responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//        attendee: getAll
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;
					const sessionKey = this.getNodeParameter('sessionKey', i) as string;

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/attendees`;
					responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'get') {

					// ----------------------------------
					//     attendee: getDetails
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;
					const sessionKey = this.getNodeParameter('sessionKey', i) as string;
					const registrantKey = this.getNodeParameter('registrantKey', i) as string;
					const details = this.getNodeParameter('details', i) as string;

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/attendees/${registrantKey}/${details}`;
					responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});

				}

			} else if (resource === 'coorganizer') {

				// *********************************************************************
				// 															coorganizer
				// *********************************************************************

				// https://developer.goto.com/GoToWebinarV2/#tag/Co-organizers

				if (operation === 'create') {

					// ----------------------------------
					//        coorganizer: create
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;

					const body = {
						external: true, // TODO: If the co-organizer has no GoToWebinar account, this value has to be set to 'true'
					} as IDataObject;

					const { givenName, email } = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (givenName) {
						body.givenName = givenName;
					}

					if (email) {
						body.email = email;
					}

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/coorganizers`;
					responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, {}, body);

				} else if (operation === 'delete') {

					// ----------------------------------
					//       coorganizer: delete
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;
					const coorganizerKey = this.getNodeParameter('organizerKey', i) as string;

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/coorganizers/${coorganizerKey}`;
					responseData = await goToWebinarApiRequest.call(this, 'DELETE', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//        coorganizer: getAll
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/coorganizers`;
					responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'reinvite') {

					// ----------------------------------
					//       coorganizer: reinvite
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;
					const coorganizerKey = this.getNodeParameter('organizerKey', i) as string;

					const endpoint = `${organizerKey}/webinars/${webinarKey}/coorganizers/${coorganizerKey}/resendInvitation`;

					responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, {}, {});

				}

			} else if (resource === 'panelist') {

				// *********************************************************************
				// 															panelist
				// *********************************************************************

				// https://developer.goto.com/GoToWebinarV2/#tag/Panelists

				if (operation === 'create') {

					// ----------------------------------
					//         panelist: create
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;

					const body = {
						email: this.getNodeParameter('email', i) as string,
						name: this.getNodeParameter('name', i) as string,
					} as IDataObject;

					const endpoint = `${organizerKey}/webinars/${webinarKey}/panelists`;
					responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, {}, body);

				} else if (operation === 'delete') {

					// ----------------------------------
					//         panelist: delete
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;
					const panelistKey = this.getNodeParameter('panelistKey', i) as string;

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/panelists/${panelistKey}`;
					responseData = await goToWebinarApiRequest.call(this, 'DELETE', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//         panelist: getAll
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;

					const endpoint = `${organizerKey}/webinars/${webinarKey}/panelists`;
					responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'reinvite') {

					// ----------------------------------
					//        panelist: reinvite
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;
					const panelistKey = this.getNodeParameter('panelistKey', i) as string;

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/panelists/${panelistKey}/resendInvitation`;
					responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, {}, {});

				}

			} else if (resource === 'estimate') {

				// *********************************************************************
				// 															registrant
				// *********************************************************************

				// https://developer.goto.com/GoToWebinarV2/#tag/Registrants

				if (operation === 'create') {

					// ----------------------------------
					//         registrant: create
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;

					const body = {
						firstName: this.getNodeParameter('firstName', i) as string,
						lastName: this.getNodeParameter('lastName', i) as string,
						email: this.getNodeParameter('email', i) as string,
					} as IDataObject;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(body, additionalFields);

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/registrants`;
					responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, {}, body);

				} else if (operation === 'delete') {

					// ----------------------------------
					//        registrant: delete
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;
					const registrantKey = this.getNodeParameter('registrantKey', i) as string;

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/registrants/${registrantKey}`;
					responseData = await goToWebinarApiRequest.call(this, 'DELETE', endpoint, {}, {});

				} else if (operation === 'get') {

					// ----------------------------------
					//        registrant: get
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;
					const registrantKey = this.getNodeParameter('registrantKey', i) as string;

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/registrants/${registrantKey}`;
					responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//        registrant: getAll
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/registrants`;
					responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});

				}

			} else if (resource === 'session') {

				// *********************************************************************
				// 															session
				// *********************************************************************

				// https://developer.goto.com/GoToWebinarV2/#tag/Sessions

				if (operation === 'get') {

					// ----------------------------------
					//         session: get
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;
					const sessionKey = this.getNodeParameter('sessionKey', i) as string;

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}`;
					responseData = await goToWebinarApiRequestAllItems.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//         session: getAll
					// ----------------------------------

					const {
						fromTime,
						toTime,
						byOrganizer,
						byWebinar,
					} = this.getNodeParameter('filters', i) as IDataObject;

					const qs = { fromTime, toTime } as IDataObject;

					if (byOrganizer) {

						const endpoint = `organizers/${organizerKey}/sessions`;
						responseData = await goToWebinarApiRequestAllItems.call(this, 'GET', endpoint, qs, {});

					} else if (byWebinar) {

						const webinarKey = this.getNodeParameter('webinarKey', i) as IDataObject;
						const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/sessions`;
						responseData = await goToWebinarApiRequestAllItems.call(this, 'GET', endpoint, qs, {});

					} else {

						const endpoint = `organizers/${organizerKey}/sessions`;
						responseData = await goToWebinarApiRequestAllItems.call(this, 'GET', endpoint, qs, {});

					}

				} else if (operation === 'getDetails') {

					// ----------------------------------
					//         session: getDetails
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;
					const sessionKey = this.getNodeParameter('sessionKey', i) as string;
					const details = this.getNodeParameter('details', i) as string;

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/${details}`;
					responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});

				}

			} else if (resource === 'webinar')	{

				// *********************************************************************
				// 															  webinar
				// *********************************************************************

				// https://developer.goto.com/GoToWebinarV2/#tag/Webinars

				if (operation === 'create') {

					// ----------------------------------
					//         webinar: create
					// ----------------------------------

					const { timesProperties } = this.getNodeParameter('times', i) as IDataObject;

					const body = {
						subject: this.getNodeParameter('subject', i) as string,
						times: timesProperties,
					} as IDataObject;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(body, additionalFields);

					const endpoint = `organizers/${organizerKey}/webinars`;
					responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, {}, body);

				} else if (operation === 'delete') {

					// ----------------------------------
					//         webinar: delete
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;

					const { sendCancellationEmails } = this.getNodeParameter('additionalFields', i) as IDataObject;

					const qs = {} as IDataObject;

					if (sendCancellationEmails) {
						qs.sendCancellationEmails = sendCancellationEmails;
					}

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}`;
					await goToWebinarApiRequest.call(this, 'DELETE', endpoint, qs, {});
					responseData = { success: true };

				} else if (operation === 'get') {

					// ----------------------------------
					//         webinar: get
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}`;
					responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//         webinar: getAll
					// ----------------------------------

					// TODO: not required in UI
					const {
						fromTime,
						toTime,
					} = this.getNodeParameter('filters', i) as IDataObject;

					const qs = { fromTime, toTime } as IDataObject;

					const endpoint = `/accounts/${accountKey}/webinars`;
					responseData = await goToWebinarApiRequestAllItems.call(this, 'GET', endpoint, qs, {});

				} else if (operation === 'update') {

					// ----------------------------------
					//         webinar: update
					// ----------------------------------

					const webinarKey = this.getNodeParameter('webinarKey', i) as string;

					const qs = {
						notifyParticipants: this.getNodeParameter('notifyParticipants', i) as boolean,
					} as IDataObject;

					let body = {};

					let updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					if (updateFields.times) {
						const { times } = updateFields as { times: { timesProperties: Array<{startTime: string, endTime: string}> } };
						body = {
							times: times.timesProperties,
						} as IDataObject;
						updateFields = omit(updateFields, ['times']);
					}

					Object.assign(body, updateFields);

					if (isEmpty(updateFields)) {
						throw new Error(`Please enter at least one field to update for the ${resource}.`);
					}

					const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}`;
					await goToWebinarApiRequestAllItems.call(this, 'PUT', endpoint, qs, body);
					responseData = { success: true };

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

			}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
