import moment from 'moment-timezone';
import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeExecutionHint,
	INodeProperties,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { calendarFields, calendarOperations } from './CalendarDescription';
import { eventFields, eventOperations } from './EventDescription';
import type { IEvent, RecurringEventInstance } from './EventInterface';
import {
	addNextOccurrence,
	addTimezoneToDate,
	dateObjectToISO,
	encodeURIComponentOnce,
	eventExtendYearIntoFuture,
	getCalendars,
	getTimezones,
	googleApiRequest,
	googleApiRequestAllItems,
	googleApiRequestWithRetries,
	type RecurrentEvent,
} from './GenericFunctions';
import { sortItemKeysByPriorityList } from '../../../utils/utilities';

const preBuiltAgentsCallout: INodeProperties = {
	// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
	displayName: 'Interact with your Google Calendar using our pre-built',
	name: 'preBuiltAgentsCalloutGoogleCalendar',
	type: 'callout',
	typeOptions: {
		calloutAction: {
			label: 'Calendar agent',
			icon: 'bot',
			type: 'openSampleWorkflowTemplate',
			templateId: 'calendar_agent_with_gcal',
		},
	},
	default: '',
};

export class GoogleCalendar implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Calendar',
		name: 'googleCalendar',
		icon: 'file:googleCalendar.svg',
		group: ['input'],
		version: [1, 1.1, 1.2, 1.3],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google Calendar API',
		defaults: {
			name: 'Google Calendar',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'googleCalendarOAuth2Api',
				required: true,
			},
		],
		properties: [
			preBuiltAgentsCallout,
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Calendar',
						value: 'calendar',
					},
					{
						name: 'Event',
						value: 'event',
					},
				],
				default: 'event',
			},
			...calendarOperations,
			...calendarFields,
			...eventOperations,
			...eventFields,
			{
				displayName:
					'This node will use the time zone set in n8n’s settings, but you can override this in the workflow settings',
				name: 'useN8nTimeZone',
				type: 'notice',
				default: '',
			},
		],
	};

	methods = {
		listSearch: {
			getCalendars,
			getTimezones,
		},
		loadOptions: {
			// Get all the calendars to display them to user so that they can
			// select them easily
			async getConferenceSolutions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const calendar = this.getCurrentNodeParameter('calendar', { extractValue: true }) as string;
				const possibleSolutions: IDataObject = {
					eventHangout: 'Google Hangout',
					eventNamedHangout: 'Google Hangout Classic',
					hangoutsMeet: 'Google Meet',
				};
				const {
					conferenceProperties: { allowedConferenceSolutionTypes },
				} = await googleApiRequest.call(
					this,
					'GET',
					`/calendar/v3/users/me/calendarList/${calendar}`,
				);
				for (const solution of allowedConferenceSolutionTypes) {
					returnData.push({
						name: possibleSolutions[solution] as string,
						value: solution,
					});
				}
				return returnData;
			},
			// Get all the colors to display them to user so that they can
			// select them easily
			async getColors(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { event } = await googleApiRequest.call(this, 'GET', '/calendar/v3/colors');
				for (const key of Object.keys(event as IDataObject)) {
					const colorName = `Background: ${event[key].background} - Foreground: ${event[key].foreground}`;
					const colorId = key;
					returnData.push({
						name: `${colorName}`,
						value: colorId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		const hints: NodeExecutionHint[] = [];
		let responseData;

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		const timezone = this.getTimezone();
		const nodeVersion = this.getNode().typeVersion;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'calendar') {
					//https://developers.google.com/calendar/v3/reference/freebusy/query
					if (operation === 'availability') {
						// we need to decode once because calendar used to be saved encoded
						const calendarId = decodeURIComponent(
							this.getNodeParameter('calendar', i, '', { extractValue: true }) as string,
						);
						const timeMin = dateObjectToISO(this.getNodeParameter('timeMin', i));
						const timeMax = dateObjectToISO(this.getNodeParameter('timeMax', i));
						const options = this.getNodeParameter('options', i);
						const outputFormat = options.outputFormat || 'availability';
						const tz = this.getNodeParameter('options.timezone', i, '', {
							extractValue: true,
						}) as string;

						const body: IDataObject = {
							timeMin: moment(timeMin).utc().format(),
							timeMax: moment(timeMax).utc().format(),
							items: [
								{
									id: calendarId,
								},
							],
							timeZone: tz || timezone,
						};

						responseData = await googleApiRequest.call(
							this,
							'POST',
							'/calendar/v3/freeBusy',
							body,
							{},
						);

						if (responseData.calendars[calendarId].errors) {
							throw new NodeApiError(
								this.getNode(),
								responseData.calendars[calendarId] as JsonObject,
								{
									itemIndex: i,
								},
							);
						}

						if (outputFormat === 'availability') {
							responseData = {
								available: !responseData.calendars[calendarId].busy.length,
							};
						} else if (outputFormat === 'bookedSlots') {
							responseData = responseData.calendars[calendarId].busy;
						}
					}
				}
				if (resource === 'event') {
					//https://developers.google.com/calendar/v3/reference/events/insert
					if (operation === 'create') {
						const calendarId = encodeURIComponentOnce(
							this.getNodeParameter('calendar', i, '', { extractValue: true }) as string,
						);
						const start = dateObjectToISO(this.getNodeParameter('start', i));
						const end = dateObjectToISO(this.getNodeParameter('end', i));
						const useDefaultReminders = this.getNodeParameter('useDefaultReminders', i) as boolean;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.maxAttendees) {
							qs.maxAttendees = additionalFields.maxAttendees as number;
						}
						if (additionalFields.sendNotifications) {
							qs.sendNotifications = additionalFields.sendNotifications as boolean;
						}
						if (additionalFields.sendUpdates) {
							qs.sendUpdates = additionalFields.sendUpdates as string;
						}
						const body: IEvent = {
							start: {
								dateTime: moment.tz(start, timezone).utc().format(),
								timeZone: timezone,
							},
							end: {
								dateTime: moment.tz(end, timezone).utc().format(),
								timeZone: timezone,
							},
						};
						if (additionalFields.attendees) {
							body.attendees = [];
							(additionalFields.attendees as string[]).forEach((attendee) => {
								body.attendees!.push.apply(
									body.attendees,
									attendee
										.split(',')
										.map((a) => a.trim())
										.map((email) => ({ email })),
								);
							});
						}
						if (additionalFields.color) {
							body.colorId = additionalFields.color as string;
						}
						if (additionalFields.description) {
							body.description = additionalFields.description as string;
						}
						if (additionalFields.guestsCanInviteOthers) {
							body.guestsCanInviteOthers = additionalFields.guestsCanInviteOthers as boolean;
						}
						if (additionalFields.guestsCanModify) {
							body.guestsCanModify = additionalFields.guestsCanModify as boolean;
						}
						if (additionalFields.guestsCanSeeOtherGuests) {
							body.guestsCanSeeOtherGuests = additionalFields.guestsCanSeeOtherGuests as boolean;
						}
						if (additionalFields.id) {
							body.id = additionalFields.id as string;
						}
						if (additionalFields.location) {
							body.location = additionalFields.location as string;
						}
						if (additionalFields.summary) {
							body.summary = additionalFields.summary as string;
						}
						if (additionalFields.showMeAs) {
							body.transparency = additionalFields.showMeAs as string;
						}
						if (additionalFields.visibility) {
							body.visibility = additionalFields.visibility as string;
						}
						if (!useDefaultReminders) {
							const reminders = (this.getNodeParameter('remindersUi', i) as IDataObject)
								.remindersValues as IDataObject[];
							body.reminders = {
								useDefault: false,
							};
							if (reminders) {
								body.reminders.overrides = reminders;
							}
						}

						if (additionalFields.allday === 'yes') {
							body.start = {
								date: timezone
									? moment.tz(start, timezone).utc(true).format('YYYY-MM-DD')
									: moment.tz(start, moment.tz.guess()).utc(true).format('YYYY-MM-DD'),
							};
							body.end = {
								date: timezone
									? moment.tz(end, timezone).utc(true).format('YYYY-MM-DD')
									: moment.tz(end, moment.tz.guess()).utc(true).format('YYYY-MM-DD'),
							};
						}

						//exampel: RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=10;UNTIL=20110701T170000Z
						//https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html
						body.recurrence = [];
						if (additionalFields.rrule) {
							body.recurrence = [`RRULE:${additionalFields.rrule}`];
						} else {
							if (additionalFields.repeatHowManyTimes && additionalFields.repeatUntil) {
								throw new NodeOperationError(
									this.getNode(),
									"You can set either 'Repeat How Many Times' or 'Repeat Until' but not both",
									{ itemIndex: i },
								);
							}
							if (additionalFields.repeatFrecuency) {
								body.recurrence?.push(
									`FREQ=${(additionalFields.repeatFrecuency as string).toUpperCase()};`,
								);
							}
							if (additionalFields.repeatHowManyTimes) {
								body.recurrence?.push(`COUNT=${additionalFields.repeatHowManyTimes};`);
							}
							if (additionalFields.repeatUntil) {
								const repeatUntil = moment(additionalFields.repeatUntil as string)
									.utc()
									.format('YYYYMMDDTHHmmss');
								body.recurrence?.push(`UNTIL=${repeatUntil}Z`);
							}
							if (body.recurrence.length !== 0) {
								body.recurrence = [`RRULE:${body.recurrence.join('')}`];
							}
						}

						if (additionalFields.conferenceDataUi) {
							const conferenceData = (additionalFields.conferenceDataUi as IDataObject)
								.conferenceDataValues as IDataObject;
							if (conferenceData) {
								qs.conferenceDataVersion = 1;
								body.conferenceData = {
									createRequest: {
										requestId: uuid(),
										conferenceSolution: {
											type: conferenceData.conferenceSolution as string,
										},
									},
								};
							}
						}
						responseData = await googleApiRequest.call(
							this,
							'POST',
							`/calendar/v3/calendars/${calendarId}/events`,
							body,
							qs,
						);
					}
					//https://developers.google.com/calendar/v3/reference/events/delete
					if (operation === 'delete') {
						const calendarId = encodeURIComponentOnce(
							this.getNodeParameter('calendar', i, '', { extractValue: true }) as string,
						);
						const eventId = this.getNodeParameter('eventId', i) as string;
						const options = this.getNodeParameter('options', i);
						if (options.sendUpdates) {
							qs.sendUpdates = options.sendUpdates as number;
						}
						responseData = await googleApiRequest.call(
							this,
							'DELETE',
							`/calendar/v3/calendars/${calendarId}/events/${eventId}`,
							{},
						);
						responseData = { success: true };
					}
					//https://developers.google.com/calendar/v3/reference/events/get
					if (operation === 'get') {
						const calendarId = encodeURIComponentOnce(
							this.getNodeParameter('calendar', i, '', { extractValue: true }) as string,
						);
						const eventId = this.getNodeParameter('eventId', i) as string;
						const options = this.getNodeParameter('options', i);
						const tz = this.getNodeParameter('options.timeZone', i, '', {
							extractValue: true,
						}) as string;
						if (options.maxAttendees) {
							qs.maxAttendees = options.maxAttendees as number;
						}
						if (tz) {
							qs.timeZone = tz;
						}
						responseData = (await googleApiRequest.call(
							this,
							'GET',
							`/calendar/v3/calendars/${calendarId}/events/${eventId}`,
							{},
							qs,
						)) as IDataObject;

						if (responseData) {
							if (nodeVersion >= 1.3 && options.returnNextInstance && responseData.recurrence) {
								const eventInstances =
									((
										(await googleApiRequest.call(
											this,
											'GET',
											`/calendar/v3/calendars/${calendarId}/events/${responseData.id}/instances`,
											{},
											{
												timeMin: new Date().toISOString(),
												maxResults: 1,
											},
										)) as IDataObject
									).items as IDataObject[]) || [];
								responseData = eventInstances[0] ? [eventInstances[0]] : [responseData];
							} else {
								responseData = addNextOccurrence([responseData as RecurrentEvent]);
							}
						}
					}
					//https://developers.google.com/calendar/v3/reference/events/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const calendarId = encodeURIComponentOnce(
							this.getNodeParameter('calendar', i, '', { extractValue: true }) as string,
						);
						const options = this.getNodeParameter('options', i);
						const tz = this.getNodeParameter('options.timeZone', i, '', {
							extractValue: true,
						}) as string;

						if (nodeVersion >= 1.3) {
							const timeMin = dateObjectToISO(this.getNodeParameter('timeMin', i));
							const timeMax = dateObjectToISO(this.getNodeParameter('timeMax', i));
							if (timeMin) {
								qs.timeMin = addTimezoneToDate(timeMin, tz || timezone);
							}
							if (timeMax) {
								qs.timeMax = addTimezoneToDate(timeMax, tz || timezone);
							}

							if (!options.recurringEventHandling || options.recurringEventHandling === 'expand') {
								qs.singleEvents = true;
							}
						}

						if (options.iCalUID) {
							qs.iCalUID = options.iCalUID as string;
						}
						if (options.maxAttendees) {
							qs.maxAttendees = options.maxAttendees as number;
						}
						if (options.orderBy) {
							qs.orderBy = options.orderBy as number;
						}
						if (options.query) {
							qs.q = options.query as number;
						}
						if (options.showDeleted) {
							qs.showDeleted = options.showDeleted as boolean;
						}
						if (options.showHiddenInvitations) {
							qs.showHiddenInvitations = options.showHiddenInvitations as boolean;
						}
						if (options.singleEvents) {
							qs.singleEvents = options.singleEvents as boolean;
						}
						if (options.timeMax) {
							qs.timeMax = addTimezoneToDate(dateObjectToISO(options.timeMax), tz || timezone);
						}
						if (options.timeMin) {
							qs.timeMin = addTimezoneToDate(dateObjectToISO(options.timeMin), tz || timezone);
						}
						if (tz) {
							qs.timeZone = tz;
						}
						if (options.updatedMin) {
							qs.updatedMin = addTimezoneToDate(
								dateObjectToISO(options.updatedMin),
								tz || timezone,
							);
						}
						if (options.fields) {
							qs.fields = options.fields as string;
						}

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'items',
								'GET',
								`/calendar/v3/calendars/${calendarId}/events`,
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await googleApiRequest.call(
								this,
								'GET',
								`/calendar/v3/calendars/${calendarId}/events`,
								{},
								qs,
							);
							responseData = responseData.items;
						}

						if (responseData) {
							if (nodeVersion >= 1.3 && options.recurringEventHandling === 'next') {
								const updatedEvents: IDataObject[] = [];

								for (const event of responseData) {
									if (event.recurrence) {
										const eventInstances =
											((
												(await googleApiRequestWithRetries({
													context: this,
													method: 'GET',
													resource: `/calendar/v3/calendars/${calendarId}/events/${event.id}/instances`,
													qs: {
														timeMin: new Date().toISOString(),
														maxResults: 1,
													},
													itemIndex: i,
												})) as IDataObject
											).items as IDataObject[]) || [];
										updatedEvents.push(eventInstances[0] || event);
										continue;
									}

									updatedEvents.push(event);
								}
								responseData = updatedEvents;
							} else if (nodeVersion >= 1.3 && options.recurringEventHandling === 'first') {
								responseData = responseData.filter((event: IDataObject) => {
									if (
										qs.timeMin &&
										event.recurrence &&
										event.created &&
										event.created < qs.timeMin
									) {
										return false;
									}

									if (
										qs.timeMax &&
										event.recurrence &&
										event.created &&
										event.created > qs.timeMax
									) {
										return false;
									}

									return true;
								});
							} else if (nodeVersion < 1.3) {
								// in node version above or equal to 1.3, this would correspond to the 'expand' option,
								// so no need to add the next occurrence as event instances returned by the API
								responseData = addNextOccurrence(responseData);
							}

							if (
								!qs.timeMax &&
								(!options.recurringEventHandling || options.recurringEventHandling === 'expand')
							) {
								const suggestTrim = eventExtendYearIntoFuture(
									responseData as RecurringEventInstance[],
									timezone,
								);

								if (suggestTrim) {
									hints.push({
										message:
											"Some events repeat far into the future. To return less of them, add a 'Before' date or change the 'Recurring Event Handling' option.",
										location: 'outputPane',
									});
								}
							}
						}
					}
					//https://developers.google.com/calendar/v3/reference/events/patch
					if (operation === 'update') {
						const calendarId = encodeURIComponentOnce(
							this.getNodeParameter('calendar', i, '', { extractValue: true }) as string,
						);
						let eventId = this.getNodeParameter('eventId', i) as string;

						if (nodeVersion >= 1.3) {
							const modifyTarget = this.getNodeParameter('modifyTarget', i, 'instance') as string;
							if (modifyTarget === 'event') {
								const instance = (await googleApiRequest.call(
									this,
									'GET',
									`/calendar/v3/calendars/${calendarId}/events/${eventId}`,
									{},
									qs,
								)) as IDataObject;
								eventId = instance.recurringEventId as string;
							}
						}

						const useDefaultReminders = this.getNodeParameter('useDefaultReminders', i) as boolean;
						const updateFields = this.getNodeParameter('updateFields', i);
						let updateTimezone = updateFields.timezone as string;

						if (nodeVersion > 1 && updateTimezone === undefined) {
							updateTimezone = timezone;
						}

						if (updateFields.maxAttendees) {
							qs.maxAttendees = updateFields.maxAttendees as number;
						}
						if (updateFields.sendNotifications) {
							qs.sendNotifications = updateFields.sendNotifications as boolean;
						}
						if (updateFields.sendUpdates) {
							qs.sendUpdates = updateFields.sendUpdates as string;
						}
						const body: IEvent = {};
						if (updateFields.start) {
							body.start = {
								dateTime: moment.tz(updateFields.start, updateTimezone).utc().format(),
								timeZone: updateTimezone,
							};
						}
						if (updateFields.end) {
							body.end = {
								dateTime: moment.tz(updateFields.end, updateTimezone).utc().format(),
								timeZone: updateTimezone,
							};
						}
						// nodeVersion < 1.2
						if (updateFields.attendees) {
							body.attendees = [];
							(updateFields.attendees as string[]).forEach((attendee) => {
								body.attendees!.push.apply(
									body.attendees,
									attendee
										.split(',')
										.map((a) => a.trim())
										.map((email) => ({ email })),
								);
							});
						}
						// nodeVersion >= 1.2
						if (updateFields.attendeesUi) {
							const { mode, attendees } = (
								updateFields.attendeesUi as {
									values: {
										mode: string;
										attendees: string[];
									};
								}
							).values;
							body.attendees = [];
							if (mode === 'add') {
								const event = await googleApiRequest.call(
									this,
									'GET',
									`/calendar/v3/calendars/${calendarId}/events/${eventId}`,
								);
								((event?.attendees as IDataObject[]) || []).forEach((attendee) => {
									body.attendees?.push(attendee);
								});
							}
							attendees.forEach((attendee) => {
								body.attendees!.push.apply(
									body.attendees,
									attendee
										.split(',')
										.map((a) => a.trim())
										.map((email) => ({ email })),
								);
							});
						}
						if (updateFields.color) {
							body.colorId = updateFields.color as string;
						}
						if (updateFields.description) {
							body.description = updateFields.description as string;
						}
						if (updateFields.guestsCanInviteOthers) {
							body.guestsCanInviteOthers = updateFields.guestsCanInviteOthers as boolean;
						}
						if (updateFields.guestsCanModify) {
							body.guestsCanModify = updateFields.guestsCanModify as boolean;
						}
						if (updateFields.guestsCanSeeOtherGuests) {
							body.guestsCanSeeOtherGuests = updateFields.guestsCanSeeOtherGuests as boolean;
						}
						if (updateFields.id) {
							body.id = updateFields.id as string;
						}
						if (updateFields.location) {
							body.location = updateFields.location as string;
						}
						if (updateFields.summary) {
							body.summary = updateFields.summary as string;
						}
						if (updateFields.showMeAs) {
							body.transparency = updateFields.showMeAs as string;
						}
						if (updateFields.visibility) {
							body.visibility = updateFields.visibility as string;
						}
						if (!useDefaultReminders) {
							const reminders = (this.getNodeParameter('remindersUi', i) as IDataObject)
								.remindersValues as IDataObject[];
							body.reminders = {
								useDefault: false,
							};
							if (reminders) {
								body.reminders.overrides = reminders;
							}
						}

						if (updateFields.allday === 'yes' && updateFields.start && updateFields.end) {
							body.start = {
								date: updateTimezone
									? moment.tz(updateFields.start, updateTimezone).utc(true).format('YYYY-MM-DD')
									: moment.tz(updateFields.start, moment.tz.guess()).utc(true).format('YYYY-MM-DD'),
							};
							body.end = {
								date: updateTimezone
									? moment.tz(updateFields.end, updateTimezone).utc(true).format('YYYY-MM-DD')
									: moment.tz(updateFields.end, moment.tz.guess()).utc(true).format('YYYY-MM-DD'),
							};
						}
						//example: RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=10;UNTIL=20110701T170000Z
						//https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html
						body.recurrence = [];
						if (updateFields.rrule) {
							body.recurrence = [`RRULE:${updateFields.rrule}`];
						} else {
							if (updateFields.repeatHowManyTimes && updateFields.repeatUntil) {
								throw new NodeOperationError(
									this.getNode(),
									"You can set either 'Repeat How Many Times' or 'Repeat Until' but not both",
									{ itemIndex: i },
								);
							}
							if (updateFields.repeatFrecuency) {
								body.recurrence?.push(
									`FREQ=${(updateFields.repeatFrecuency as string).toUpperCase()};`,
								);
							}
							if (updateFields.repeatHowManyTimes) {
								body.recurrence?.push(`COUNT=${updateFields.repeatHowManyTimes};`);
							}
							if (updateFields.repeatUntil) {
								const repeatUntil = moment(updateFields.repeatUntil as string)
									.utc()
									.format('YYYYMMDDTHHmmss');

								body.recurrence?.push(`UNTIL=${repeatUntil}Z`);
							}
							if (body.recurrence.length !== 0) {
								body.recurrence = [`RRULE:${body.recurrence.join('')}`];
							} else {
								delete body.recurrence;
							}
						}
						responseData = await googleApiRequest.call(
							this,
							'PATCH',
							`/calendar/v3/calendars/${calendarId}/events/${eventId}`,
							body,
							qs,
						);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (!this.continueOnFail()) {
					throw error;
				} else {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
			}
		}

		const keysPriorityList = [
			'id',
			'summary',
			'start',
			'end',
			'attendees',
			'creator',
			'organizer',
			'description',
			'location',
			'created',
			'updated',
		];

		let nodeExecutionData = returnData;
		if (nodeVersion >= 1.3) {
			nodeExecutionData = sortItemKeysByPriorityList(returnData, keysPriorityList);
		}

		if (hints.length) {
			this.addExecutionHints(...hints);
		}

		return [nodeExecutionData];
	}
}
