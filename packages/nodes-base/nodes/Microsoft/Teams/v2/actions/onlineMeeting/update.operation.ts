import {
	type IDataObject,
	type INodeProperties,
	type IExecuteFunctions,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { resolveMeetingId } from './meetingLocator';
import { applyMeetingSettings, withMeetingSettings } from './meetingSettings';
import {
	MEETING_HINT,
	meetingRequest,
	optionalText,
	throwIfOnlineMeetingUnsupported,
	toGraphUtc,
} from './shared';
import { meetingRLC } from '../../descriptions';
import { buildTeamsPath, rewriteNotFound, SP_HIDE } from '../../transport';

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
		]),
	},
];

const displayOptions = {
	show: {
		resource: ['onlineMeeting'],
		operation: ['update'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/onlinemeeting-update?view=graph-rest-1.0&tabs=http
	throwIfOnlineMeetingUnsupported.call(this);

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

	if (Object.keys(body).length === 0) {
		throw new NodeOperationError(this.getNode(), 'No fields are set to update', {
			description: "Add at least one field under 'Update Fields' and try again",
		});
	}

	const meetingId = await resolveMeetingId.call(this, i);
	const endpoint = buildTeamsPath.call(this, ['/v1.0/me/onlineMeetings/', { id: meetingId }]);

	try {
		return await meetingRequest.call(this, 'PATCH', endpoint, body);
	} catch (error) {
		rewriteNotFound.call(
			this,
			error,
			"The meeting you are trying to update doesn't exist",
			MEETING_HINT,
		);
	}
}
