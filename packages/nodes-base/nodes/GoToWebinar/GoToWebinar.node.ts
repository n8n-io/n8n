import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
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
	handleGetAll,
	loadAnswers,
	loadRegistranMultiChoiceQuestions,
	loadRegistranSimpleQuestions,
	loadWebinars,
	loadWebinarSessions,
} from './GenericFunctions';

import { isEmpty, omit } from 'lodash';

import moment from 'moment-timezone';

export class GoToWebinar implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GoToWebinar',
		name: 'goToWebinar',
		icon: 'file:gotowebinar.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the GoToWebinar API',
		defaults: {
			name: 'GoToWebinar',
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
				noDataExpression: true,
				options: [
					{
						name: 'Attendee',
						value: 'attendee',
					},
					{
						name: 'Co-Organizer',
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
			async getWebinars(this: ILoadOptionsFunctions) {
				return await loadWebinars.call(this);
			},
			async getAnswers(this: ILoadOptionsFunctions) {
				return await loadAnswers.call(this);
			},
			async getWebinarSessions(this: ILoadOptionsFunctions) {
				return await loadWebinarSessions.call(this);
			},
			// Get all the timezones to display them to user so that he can
			// select them easily
			async getTimezones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (const timezone of moment.tz.names()) {
					const timezoneName = timezone;
					const timezoneId = timezone;
					returnData.push({
						name: timezoneName,
						value: timezoneId,
					});
				}
				return returnData;
			},
			async getRegistranSimpleQuestions(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return await loadRegistranSimpleQuestions.call(this);
			},
			async getRegistranMultiChoiceQuestions(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return await loadRegistranMultiChoiceQuestions.call(this);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		const { oauthTokenData } = (await this.getCredentials('goToWebinarOAuth2Api')) as {
			oauthTokenData: { account_key: string; organizer_key: string };
		};

		const accountKey = oauthTokenData.account_key;
		const organizerKey = oauthTokenData.organizer_key;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'attendee') {
					// *********************************************************************
					//                            attendee
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
						responseData = await handleGetAll.call(this, endpoint, {}, {}, resource);
					} else if (operation === 'getDetails') {
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
					//                            coorganizer
					// *********************************************************************

					// https://developer.goto.com/GoToWebinarV2/#tag/Co-organizers

					if (operation === 'create') {
						// ----------------------------------
						//        coorganizer: create
						// ----------------------------------

						const webinarKey = this.getNodeParameter('webinarKey', i) as string;

						const body = {
							external: this.getNodeParameter('isExternal', i) as boolean,
						} as IDataObject;

						if (body.external === false) {
							body.organizerKey = this.getNodeParameter('organizerKey', i) as string;
						}

						if (body.external === true) {
							body.givenName = this.getNodeParameter('givenName', i) as string;
							body.email = this.getNodeParameter('email', i) as string;
						}

						const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/coorganizers`;
						responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, {}, [body]);
					} else if (operation === 'delete') {
						// ----------------------------------
						//       coorganizer: delete
						// ----------------------------------

						const webinarKey = this.getNodeParameter('webinarKey', i) as string;
						const coorganizerKey = this.getNodeParameter('coorganizerKey', i) as string;

						const qs = {
							external: this.getNodeParameter('isExternal', i) as boolean,
						};

						const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/coorganizers/${coorganizerKey}`;
						responseData = await goToWebinarApiRequest.call(this, 'DELETE', endpoint, qs, {});
						responseData = { success: true };
					} else if (operation === 'getAll') {
						// ----------------------------------
						//        coorganizer: getAll
						// ----------------------------------

						const webinarKey = this.getNodeParameter('webinarKey', i) as string;

						const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/coorganizers`;
						responseData = await handleGetAll.call(this, endpoint, {}, {}, resource);
					} else if (operation === 'reinvite') {
						// ----------------------------------
						//       coorganizer: reinvite
						// ----------------------------------

						const webinarKey = this.getNodeParameter('webinarKey', i) as string;
						const coorganizerKey = this.getNodeParameter('coorganizerKey', i) as string;

						const qs = {
							external: this.getNodeParameter('isExternal', i) as boolean,
						};

						const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/coorganizers/${coorganizerKey}/resendInvitation`;

						responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, qs, {});
						responseData = { success: true };
					}
				} else if (resource === 'panelist') {
					// *********************************************************************
					//                            panelist
					// *********************************************************************

					// https://developer.goto.com/GoToWebinarV2/#tag/Panelists

					if (operation === 'create') {
						// ----------------------------------
						//         panelist: create
						// ----------------------------------

						const webinarKey = this.getNodeParameter('webinarKey', i) as string;

						const body = [
							{
								name: this.getNodeParameter('name', i) as string,
								email: this.getNodeParameter('email', i) as string,
							},
						] as IDataObject[];

						const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/panelists`;
						responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, {}, body);
					} else if (operation === 'delete') {
						// ----------------------------------
						//         panelist: delete
						// ----------------------------------

						const webinarKey = this.getNodeParameter('webinarKey', i) as string;
						const panelistKey = this.getNodeParameter('panelistKey', i) as string;

						const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/panelists/${panelistKey}`;
						responseData = await goToWebinarApiRequest.call(this, 'DELETE', endpoint, {}, {});
						responseData = { success: true };
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         panelist: getAll
						// ----------------------------------

						const webinarKey = this.getNodeParameter('webinarKey', i) as string;

						const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/panelists`;
						responseData = await handleGetAll.call(this, endpoint, {}, {}, resource);
					} else if (operation === 'reinvite') {
						// ----------------------------------
						//        panelist: reinvite
						// ----------------------------------

						const webinarKey = this.getNodeParameter('webinarKey', i) as string;
						const panelistKey = this.getNodeParameter('panelistKey', i) as string;

						const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/panelists/${panelistKey}/resendInvitation`;
						responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, {}, {});
						responseData = { success: true };
					}
				} else if (resource === 'registrant') {
					// *********************************************************************
					//                            registrant
					// *********************************************************************

					// https://developer.goto.com/GoToWebinarV2/#tag/Registrants

					if (operation === 'create') {
						// ----------------------------------
						//         registrant: create
						// ----------------------------------

						const webinarKey = this.getNodeParameter('webinarKey', i) as string;

						const qs = {} as IDataObject;
						const body = {
							firstName: this.getNodeParameter('firstName', i) as string,
							lastName: this.getNodeParameter('lastName', i) as string,
							email: this.getNodeParameter('email', i) as string,
							responses: [],
						} as IDataObject;

						let additionalFields = this.getNodeParameter('additionalFields', i) as Partial<{
							resendConfirmation: boolean;
							fullAddress: {
								details: { [key: string]: string };
							};
							simpleResponses: [{ [key: string]: string }];
							multiChoiceResponses: [{ [key: string]: string }];
						}>;

						if (additionalFields.resendConfirmation) {
							qs.resendConfirmation = additionalFields.resendConfirmation;
							additionalFields = omit(additionalFields, ['resendConfirmation']);
						}

						if (additionalFields.fullAddress) {
							Object.assign(body, additionalFields.fullAddress.details);
							additionalFields = omit(additionalFields, ['fullAddress']);
						}

						if (additionalFields.simpleResponses) {
							//@ts-ignore
							body.responses.push(...additionalFields.simpleResponses.details);
							additionalFields = omit(additionalFields, ['simpleResponses']);
						}

						if (additionalFields.multiChoiceResponses) {
							//@ts-ignore
							body.responses.push(...additionalFields.multiChoiceResponses.details);
							additionalFields = omit(additionalFields, ['multiChoiceResponses']);
						}

						Object.assign(body, additionalFields);

						const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/registrants`;
						responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, qs, body);
					} else if (operation === 'delete') {
						// ----------------------------------
						//        registrant: delete
						// ----------------------------------

						const webinarKey = this.getNodeParameter('webinarKey', i) as string;
						const registrantKey = this.getNodeParameter('registrantKey', i) as string;

						const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/registrants/${registrantKey}`;
						responseData = await goToWebinarApiRequest.call(this, 'DELETE', endpoint, {}, {});
						responseData = { success: true };
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
						responseData = await handleGetAll.call(this, endpoint, {}, {}, resource);
					}
				} else if (resource === 'session') {
					// *********************************************************************
					//                              session
					// *********************************************************************

					// https://developer.goto.com/GoToWebinarV2/#tag/Sessions

					if (operation === 'get') {
						// ----------------------------------
						//         session: get
						// ----------------------------------

						const webinarKey = this.getNodeParameter('webinarKey', i) as string;
						const sessionKey = this.getNodeParameter('sessionKey', i) as string;

						const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}`;
						responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         session: getAll
						// ----------------------------------

						const qs = {} as IDataObject;

						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

						if (!returnAll) {
							qs.limit = this.getNodeParameter('limit', 0) as number;
						}

						const { webinarKey, times } = this.getNodeParameter('additionalFields', i) as {
							filterByWebinar: boolean;
							webinarKey: string;
							times: {
								timesProperties: { [key: string]: string };
							};
						};

						if (times) {
							qs.fromTime = moment(times.timesProperties.fromTime).format();
							qs.toTime = moment(times.timesProperties.toTime).format();
						} else {
							qs.fromTime = moment().subtract(1, 'years').format();
							qs.toTime = moment().format();
						}

						if (webinarKey !== undefined) {
							const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/sessions`;
							responseData = await goToWebinarApiRequestAllItems.call(
								this,
								'GET',
								endpoint,
								qs,
								{},
								resource,
							);
						} else {
							const endpoint = `organizers/${organizerKey}/sessions`;
							responseData = await goToWebinarApiRequestAllItems.call(
								this,
								'GET',
								endpoint,
								qs,
								{},
								resource,
							);
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
				} else if (resource === 'webinar') {
					// *********************************************************************
					//                               webinar
					// *********************************************************************

					// https://developer.goto.com/GoToWebinarV2/#tag/Webinars

					if (operation === 'create') {
						// ----------------------------------
						//         webinar: create
						// ----------------------------------

						const timesProperties = this.getNodeParameter(
							'times.timesProperties',
							i,
							[],
						) as IDataObject;

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

						const { sendCancellationEmails } = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;

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

						const qs = {} as IDataObject;

						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

						if (!returnAll) {
							qs.limit = this.getNodeParameter('limit', 0) as number;
						}

						const { times } = this.getNodeParameter('additionalFields', i) as {
							times: {
								timesProperties: { [key: string]: string };
							};
						};

						if (times) {
							qs.fromTime = moment(times.timesProperties.fromTime).format();
							qs.toTime = moment(times.timesProperties.toTime).format();
						} else {
							qs.fromTime = moment().subtract(1, 'years').format();
							qs.toTime = moment().format();
						}

						const endpoint = `accounts/${accountKey}/webinars`;
						responseData = await goToWebinarApiRequestAllItems.call(
							this,
							'GET',
							endpoint,
							qs,
							{},
							resource,
						);
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
							const { times } = updateFields as {
								times: { timesProperties: Array<{ startTime: string; endTime: string }> };
							};

							body = {
								times: times.timesProperties,
							} as IDataObject;

							updateFields = omit(updateFields, ['times']);
						}

						Object.assign(body, updateFields);

						if (isEmpty(updateFields)) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}`;
						await goToWebinarApiRequest.call(this, 'PUT', endpoint, qs, body);
						responseData = { success: true };
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
