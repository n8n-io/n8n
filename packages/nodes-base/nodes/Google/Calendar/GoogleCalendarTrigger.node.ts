import moment from 'moment-timezone';
import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	encodeURIComponentOnce,
	getCalendars,
	googleApiRequest,
	googleApiRequestAllItems,
} from './GenericFunctions';

export class GoogleCalendarTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Calendar Trigger',
		name: 'googleCalendarTrigger',
		icon: 'file:googleCalendar.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["triggerOn"]}}',
		description: 'Starts the workflow when Google Calendar events occur',
		defaults: {
			name: 'Google Calendar Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'googleCalendarOAuth2Api',
				required: true,
			},
		],
		polling: true,
		properties: [
			{
				displayName: 'Calendar',
				name: 'calendarId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'Google Calendar to operate on',
				modes: [
					{
						displayName: 'Calendar',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Calendar...',
						typeOptions: {
							searchListMethod: 'getCalendars',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									// calendar ids are emails. W3C email regex with optional trailing whitespace.
									regex:
										'(^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*(?:[ \t]+)*$)',
									errorMessage: 'Not a valid Google Calendar ID',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex: '(^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*)',
						},
						placeholder: 'name@google.com',
					},
				],
			},
			{
				displayName: 'Trigger On',
				name: 'triggerOn',
				type: 'options',
				required: true,
				default: '',
				options: [
					{
						name: 'Event Cancelled',
						value: 'eventCancelled',
					},
					{
						name: 'Event Created',
						value: 'eventCreated',
					},
					{
						name: 'Event Ended',
						value: 'eventEnded',
					},
					{
						name: 'Event Started',
						value: 'eventStarted',
					},
					{
						name: 'Event Updated',
						value: 'eventUpdated',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Match Term',
						name: 'matchTerm',
						type: 'string',
						default: '',
						description:
							'Free text search terms to filter events that match these terms in any field, except for extended properties',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			getCalendars,
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const poolTimes = this.getNodeParameter('pollTimes.item', []) as IDataObject[];
		const triggerOn = this.getNodeParameter('triggerOn', '') as string;
		const calendarId = encodeURIComponentOnce(
			this.getNodeParameter('calendarId', '', { extractValue: true }) as string,
		);
		const webhookData = this.getWorkflowStaticData('node');
		const matchTerm = this.getNodeParameter('options.matchTerm', '') as string;

		if (poolTimes.length === 0) {
			throw new NodeOperationError(this.getNode(), 'Please set a poll time');
		}

		if (triggerOn === '') {
			throw new NodeOperationError(this.getNode(), 'Please select an event');
		}

		if (calendarId === '') {
			throw new NodeOperationError(this.getNode(), 'Please select a calendar');
		}

		const now = moment().utc().format();

		const startDate = (webhookData.lastTimeChecked as string) || now;

		const endDate = now;

		const qs: IDataObject = {
			showDeleted: false,
		};

		if (matchTerm !== '') {
			qs.q = matchTerm;
		}

		let events;

		if (
			triggerOn === 'eventCreated' ||
			triggerOn === 'eventUpdated' ||
			triggerOn === 'eventCancelled'
		) {
			Object.assign(qs, {
				updatedMin: startDate,
				orderBy: 'updated',
				showDeleted: triggerOn === 'eventCancelled',
			});
		} else if (triggerOn === 'eventStarted' || triggerOn === 'eventEnded') {
			Object.assign(qs, {
				singleEvents: true,
				timeMin: moment(startDate).startOf('second').utc().format(),
				timeMax: moment(endDate).endOf('second').utc().format(),
				orderBy: 'startTime',
			});
		}

		if (this.getMode() === 'manual') {
			delete qs.updatedMin;
			delete qs.timeMin;
			delete qs.timeMax;

			qs.maxResults = 1;
			events = await googleApiRequest.call(
				this,
				'GET',
				`/calendar/v3/calendars/${calendarId}/events`,
				{},
				qs,
			);
			events = events.items;
		} else {
			events = await googleApiRequestAllItems.call(
				this,
				'items',
				'GET',
				`/calendar/v3/calendars/${calendarId}/events`,
				{},
				qs,
			);
			if (triggerOn === 'eventCreated') {
				events = events.filter((event: { created: string }) =>
					moment(event.created).isBetween(startDate, endDate),
				);
			} else if (triggerOn === 'eventUpdated' || triggerOn === 'eventCancelled') {
				events = events.filter(
					(event: { created: string; updated: string }) =>
						!moment(moment(event.created).format('YYYY-MM-DDTHH:mm:ss')).isSame(
							moment(event.updated).format('YYYY-MM-DDTHH:mm:ss'),
						),
				);
				if (triggerOn === 'eventCancelled') {
					events = events.filter((event: { status: string }) => event.status === 'cancelled');
				}
			} else if (triggerOn === 'eventStarted') {
				events = events.filter((event: { start: { dateTime: string } }) =>
					moment(event.start.dateTime).isBetween(startDate, endDate, null, '[]'),
				);
			} else if (triggerOn === 'eventEnded') {
				events = events.filter((event: { end: { dateTime: string } }) =>
					moment(event.end.dateTime).isBetween(startDate, endDate, null, '[]'),
				);
			}
		}

		webhookData.lastTimeChecked = endDate;

		if (Array.isArray(events) && events.length) {
			return [this.helpers.returnJsonArray(events)];
		}

		if (this.getMode() === 'manual') {
			throw new NodeApiError(this.getNode(), {
				message: 'No data with the current filter could be found',
			});
		}

		return null;
	}
}
