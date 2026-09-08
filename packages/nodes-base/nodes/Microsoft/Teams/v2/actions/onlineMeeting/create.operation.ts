import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { applyMeetingSettings, withMeetingSettings } from './meetingSettings';
import {
	meetingRequest,
	requiredText,
	throwIfOnlineMeetingUnsupported,
	toGraphUtc,
} from './shared';
import { SP_HIDE } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Subject',
		name: 'subject',
		required: true,
		type: 'string',
		default: '',
		placeholder: 'e.g. Quarterly Sync',
		description: 'The subject of the meeting',
	},
	{
		displayName: 'Start Time',
		name: 'startDateTime',
		required: true,
		type: 'dateTime',
		default: '',
		description: 'The date and time when the meeting starts',
	},
	{
		displayName: 'End Time',
		name: 'endDateTime',
		required: true,
		type: 'dateTime',
		default: '',
		description: 'The date and time when the meeting ends. Must be later than the start time.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add option',
		options: withMeetingSettings([
			{
				displayName: 'Require Passcode',
				name: 'passcodeRequired',
				type: 'boolean',
				default: false,
				description:
					'Whether a passcode is required to join the meeting by meeting ID. This setting cannot be changed after the meeting is created.',
			},
		]),
	},
];

const displayOptions = {
	show: {
		resource: ['onlineMeeting'],
		operation: ['create'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/application-post-onlinemeetings?view=graph-rest-1.0&tabs=http
	throwIfOnlineMeetingUnsupported.call(this);

	const options = this.getNodeParameter('options', i);
	const body: IDataObject = {
		subject: requiredText.call(this, 'subject', i, 'Subject'),
		startDateTime: toGraphUtc.call(this, this.getNodeParameter('startDateTime', i), 'Start Time'),
		endDateTime: toGraphUtc.call(this, this.getNodeParameter('endDateTime', i), 'End Time'),
	};
	applyMeetingSettings(body, options);
	if (options.passcodeRequired !== undefined) {
		body.joinMeetingIdSettings = { isPasscodeRequired: options.passcodeRequired };
	}

	return await meetingRequest.call(this, 'POST', '/v1.0/me/onlineMeetings', body);
}
