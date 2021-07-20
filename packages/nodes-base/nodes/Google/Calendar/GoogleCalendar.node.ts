import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	googleApiRequest,
	googleApiRequestAllItems,
} from './GenericFunctions';

import {
	eventFields,
	eventOperations,
} from './EventDescription';

import {
	calendarFields,
	calendarOperations,
} from './CalendarDescription';

import {
	IEvent,
} from './EventInterface';

import * as moment from 'moment-timezone';

import { v4 as uuid } from 'uuid';

export class GoogleCalendar implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Calendar',
		name: 'googleCalendar',
		icon: 'file:googleCalendar.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google Calendar API',
		defaults: {
			name: 'Google Calendar',
			color: '#3E87E4',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleCalendarOAuth2Api',
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
						name: 'Calendar',
						value: 'calendar',
					},
					{
						name: 'Event',
						value: 'event',
					},
				],
				default: 'event',
				description: 'The resource to operate on.',
			},
			...calendarOperations,
			...calendarFields,
			...eventOperations,
			...eventFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the calendars to display them to user so that he can
			// select them easily
			async getConferenceSolutations(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const calendar = this.getCurrentNodeParameter('calendar') as string;
				const posibleSolutions: IDataObject = {
					'eventHangout': 'Google Hangout',
					'eventNamedHangout': 'Google Hangout Classic',
					'hangoutsMeet': 'Google Meet',
				};
				const { conferenceProperties: { allowedConferenceSolutionTypes } } = await googleApiRequest.call(
					this,
					'GET',
					`/calendar/v3/users/me/calendarList/${calendar}`,
				);
				for (const solution of allowedConferenceSolutionTypes) {
					returnData.push({
						name: posibleSolutions[solution] as string,
						value: solution,
					});
				}
				return returnData;
			},
			// Get all the calendars to display them to user so that he can
			// select them easily
			async getCalendars(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const calendars = await googleApiRequestAllItems.call(
					this,
					'items',
					'GET',
					'/calendar/v3/users/me/calendarList',
				);
				for (const calendar of calendars) {
					const calendarName = calendar.summary;
					const calendarId = calendar.id;
					returnData.push({
						name: calendarName,
						value: calendarId,
					});
				}
				return returnData;
			},
			// Get all the colors to display them to user so that he can
			// select them easily
			async getColors(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { event } = await googleApiRequest.call(
					this,
					'GET',
					'/calendar/v3/colors',
				);
				for (const key of Object.keys(event)) {
					const colorName = `Background: ${event[key].background} - Foreground: ${event[key].foreground}`;
					const colorId = key;
					returnData.push({
						name: `${colorName}`,
						value: colorId,
					});
				}
				return returnData;
			},
			// Get all the timezones to display them to user so that he can
			// select them easily
			async getTimezones(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
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
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'calendar') {
					//https://developers.google.com/calendar/v3/reference/freebusy/query
					if (operation === 'availability') {
						const timezone = this.getTimezone();
						const calendarId = this.getNodeParameter('calendar', i) as string;
						const timeMin = this.getNodeParameter('timeMin', i) as string;
						const timeMax = this.getNodeParameter('timeMax', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const outputFormat = options.outputFormat || 'availability';

						const body: IDataObject = {
							timeMin: moment.tz(timeMin, timezone).utc().format(),
							timeMax: moment.tz(timeMax, timezone).utc().format(),
							items: [
								{
									id: calendarId,
								},
							],
							timeZone: options.timezone || timezone,
						};

						responseData = await googleApiRequest.call(
							this,
							'POST',
							`/calendar/v3/freeBusy`,
							body,
							{},
						);

						if (responseData.calendars[calendarId].errors) {
							throw new NodeApiError(this.getNode(), responseData.calendars[calendarId]);
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
						const calendarId = this.getNodeParameter('calendar', i) as string;
						const start = this.getNodeParameter('start', i) as string;
						const end = this.getNodeParameter('end', i) as string;
						const useDefaultReminders = this.getNodeParameter(
							'useDefaultReminders',
							i,
						) as boolean;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;
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
								dateTime: start,
								timeZone: additionalFields.timeZone || this.getTimezone(),
							},
							end: {
								dateTime: end,
								timeZone: additionalFields.timeZone || this.getTimezone(),
							},
						};
						if (additionalFields.attendees) {
							body.attendees = [];
							(additionalFields.attendees as string[]).forEach(attendee => {
								body.attendees!.push.apply(body.attendees, attendee.split(',').map(a => a.trim()).map(email => ({ email })));
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
							const reminders = (this.getNodeParameter(
								'remindersUi',
								i,
							) as IDataObject).remindersValues as IDataObject[];
							body.reminders = {
								useDefault: false,
							};
							if (reminders) {
								body.reminders.overrides = reminders;
							}
						}
						if (additionalFields.allday) {
							body.start = {
								date: moment(start)
									.utc()
									.format('YYYY-MM-DD'),
							};
							body.end = {
								date: moment(end)
									.utc()
									.format('YYYY-MM-DD'),
							};
						}
						//exampel: RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=10;UNTIL=20110701T170000Z
						//https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html
						body.recurrence = [];
						if (additionalFields.rrule) {
							body.recurrence = [`RRULE:${additionalFields.rrule}`];
						} else {
							if (
								additionalFields.repeatHowManyTimes &&
								additionalFields.repeatUntil
							) {
								throw new NodeOperationError(this.getNode(),
									`You can set either 'Repeat How Many Times' or 'Repeat Until' but not both`,
								);
							}
							if (additionalFields.repeatFrecuency) {
								body.recurrence?.push(
									`FREQ=${(additionalFields.repeatFrecuency as string).toUpperCase()};`,
								);
							}
							if (additionalFields.repeatHowManyTimes) {
								body.recurrence?.push(
									`COUNT=${additionalFields.repeatHowManyTimes};`,
								);
							}
							if (additionalFields.repeatUntil) {
								body.recurrence?.push(
									`UNTIL=${moment(additionalFields.repeatUntil as string)
										.utc()
										.format('YYYYMMDDTHHmmss')}Z`,
								);
							}
							if (body.recurrence.length !== 0) {
								body.recurrence = [`RRULE:${body.recurrence.join('')}`];
							}
						}

						if (additionalFields.conferenceDataUi) {
							const conferenceData = (additionalFields.conferenceDataUi as IDataObject).conferenceDataValues as IDataObject;
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
						const calendarId = this.getNodeParameter('calendar', i) as string;
						const eventId = this.getNodeParameter('eventId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
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
						const calendarId = this.getNodeParameter('calendar', i) as string;
						const eventId = this.getNodeParameter('eventId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						if (options.maxAttendees) {
							qs.maxAttendees = options.maxAttendees as number;
						}
						if (options.timeZone) {
							qs.timeZone = options.timeZone as string;
						}
						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/calendar/v3/calendars/${calendarId}/events/${eventId}`,
							{},
							qs,
						);
					}
					//https://developers.google.com/calendar/v3/reference/events/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const calendarId = this.getNodeParameter('calendar', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
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
							qs.timeMax = options.timeMax as string;
						}
						if (options.timeMin) {
							qs.timeMin = options.timeMin as string;
						}
						if (options.timeZone) {
							qs.timeZone = options.timeZone as string;
						}
						if (options.updatedMin) {
							qs.updatedMin = options.updatedMin as string;
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
							qs.maxResults = this.getNodeParameter('limit', i) as number;
							responseData = await googleApiRequest.call(
								this,
								'GET',
								`/calendar/v3/calendars/${calendarId}/events`,
								{},
								qs,
							);
							responseData = responseData.items;
						}
					}
					//https://developers.google.com/calendar/v3/reference/events/patch
					if (operation === 'update') {
						const calendarId = this.getNodeParameter('calendar', i) as string;
						const eventId = this.getNodeParameter('eventId', i) as string;
						const useDefaultReminders = this.getNodeParameter(
							'useDefaultReminders',
							i,
						) as boolean;
						const updateFields = this.getNodeParameter(
							'updateFields',
							i,
						) as IDataObject;
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
								dateTime: updateFields.start,
								timeZone: updateFields.timeZone || this.getTimezone(),
							};
						}
						if (updateFields.end) {
							body.end = {
								dateTime: updateFields.end,
								timeZone: updateFields.timeZone || this.getTimezone(),
							};
						}
						if (updateFields.attendees) {
							body.attendees = [];
							(updateFields.attendees as string[]).forEach(attendee => {
								body.attendees!.push.apply(body.attendees, attendee.split(',').map(a => a.trim()).map(email => ({ email })));
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
							const reminders = (this.getNodeParameter(
								'remindersUi',
								i,
							) as IDataObject).remindersValues as IDataObject[];
							body.reminders = {
								useDefault: false,
							};
							if (reminders) {
								body.reminders.overrides = reminders;
							}
						}
						if (updateFields.allday && updateFields.start && updateFields.end) {
							body.start = {
								date: moment(updateFields.start as string)
									.utc()
									.format('YYYY-MM-DD'),
							};
							body.end = {
								date: moment(updateFields.end as string)
									.utc()
									.format('YYYY-MM-DD'),
							};
						}
						//exampel: RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=10;UNTIL=20110701T170000Z
						//https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html
						body.recurrence = [];
						if (updateFields.rrule) {
							body.recurrence = [`RRULE:${updateFields.rrule}`];
						} else {
							if (updateFields.repeatHowManyTimes && updateFields.repeatUntil) {
								throw new NodeOperationError(this.getNode(),
									`You can set either 'Repeat How Many Times' or 'Repeat Until' but not both`,
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
								body.recurrence?.push(
									`UNTIL=${moment(updateFields.repeatUntil as string)
										.utc()
										.format('YYYYMMDDTHHmmss')}Z`,
								);
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

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail() !== true) {
					throw error;
				} else {
					// Return the actual reason as error
					returnData.push(
						{
							error: error.message,
						},
					);
					continue;
				}
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
