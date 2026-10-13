import { isRecord } from '@n8n/utils/is-record';
import {
	type IDataObject,
	type INodeProperties,
	type IExecuteFunctions,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { resolveAttendees, updateAttendeesField } from './attendees';
import { resolveMeetingId } from './meetingLocator';
import { applyMeetingSettings, withMeetingSettings } from './meetingSettings';
import { meetingHint, meetingRequest, meetingsPath, toGraphUtc } from './shared';
import { meetingRLC } from '../../descriptions';
import { optionalText } from '../../helpers/parameters';
import { rewriteNotFound } from '../../transport';

const properties: INodeProperties[] = [
	meetingRLC,
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		options: withMeetingSettings([
			{
				displayName: 'End Time',
				name: 'endDateTime',
				type: 'dateTime',
				default: '',
				description:
					'The date and time when the meeting ends. Must be later than Start Time. Set together with Start Time.',
			},
			{
				displayName: 'Start Time',
				name: 'startDateTime',
				type: 'dateTime',
				default: '',
				description: 'The date and time when the meeting starts. Set together with End Time.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				placeholder: 'e.g. Quarterly Sync',
				description: 'The subject of the meeting',
			},
			updateAttendeesField,
			{
				displayName: 'Remove All Attendees',
				name: 'removeAllAttendees',
				type: 'boolean',
				default: false,
				description: 'Whether to remove every attendee from the meeting. The organizer stays.',
			},
		]),
	},
];

const hasAttendeeRows = (field: unknown) =>
	isRecord(field) && Array.isArray(field.attendee) && field.attendee.length > 0;

const displayOptions = {
	show: {
		resource: ['onlineMeeting'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/onlinemeeting-update?view=graph-rest-1.0&tabs=http
	const updateFields = this.getNodeParameter('updateFields', i);

	const hasStart = Boolean(updateFields.startDateTime);
	const hasEnd = Boolean(updateFields.endDateTime);
	if (hasStart !== hasEnd) {
		throw new NodeOperationError(
			this.getNode(),
			'Start Time and End Time must be updated together',
			{
				description: 'Microsoft Graph requires both times whenever either one changes',
			},
		);
	}

	const body: IDataObject = {};
	const subject = optionalText.call(this, updateFields.subject, 'Subject');
	if (subject) {
		body.subject = subject;
	}
	if (hasStart) {
		body.startDateTime = toGraphUtc.call(this, updateFields.startDateTime, 'Start Time');
		body.endDateTime = toGraphUtc.call(this, updateFields.endDateTime, 'End Time');
	}
	applyMeetingSettings(body, updateFields);

	// The two collection editors disagree on what deleting the last row leaves behind (`{}` or
	// `{ attendee: [] }`), so an empty list must not be a destructive signal: only rows replace the
	// roster, and Remove All Attendees is the explicit way to clear it. The conflict is checked
	// before the lookups so it costs no request.
	const removeAll = updateFields.removeAllAttendees === true;
	if (removeAll && hasAttendeeRows(updateFields.attendees)) {
		throw new NodeOperationError(
			this.getNode(),
			'Remove All Attendees cannot be combined with Attendees',
			{
				description:
					'Turn off Remove All Attendees to send a new list, or remove the Attendees field to clear the meeting.',
			},
		);
	}
	const attendees = await resolveAttendees.call(this, i, updateFields.attendees);
	if (removeAll) {
		body.participants = { attendees: [] };
	} else if (attendees.length) {
		body.participants = { attendees };
	}

	if (Object.keys(body).length === 0) {
		throw new NodeOperationError(this.getNode(), 'No fields are set to update', {
			description: "Add at least one field under 'Update Fields' and try again",
		});
	}

	const meetingId = await resolveMeetingId.call(this, i);
	const endpoint = await meetingsPath.call(this, i, ['/', { id: meetingId }]);

	try {
		return await meetingRequest.call(this, 'PATCH', endpoint, body);
	} catch (error) {
		throw rewriteNotFound.call(
			this,
			error,
			"The meeting you are trying to update doesn't exist",
			meetingHint.call(this),
		);
	}
}
