import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { throwIfOnlineMeetingUnsupported } from './sharedGuard';
import { microsoftApiRequest, SP_HIDE } from '../../transport';

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
		options: [
			{
				displayName: 'Allow Attendees to Enable Camera',
				name: 'allowAttendeeToEnableCamera',
				type: 'boolean',
				default: true,
				description: 'Whether attendees can turn on their camera',
			},
			{
				displayName: 'Allow Attendees to Enable Microphone',
				name: 'allowAttendeeToEnableMic',
				type: 'boolean',
				default: true,
				description: 'Whether attendees can turn on their microphone',
			},
			{
				displayName: 'Allow Meeting Chat',
				name: 'allowMeetingChat',
				type: 'options',
				options: [
					{
						name: 'Disabled',
						value: 'disabled',
					},
					{
						name: 'Enabled',
						value: 'enabled',
					},
					{
						name: 'Limited',
						value: 'limited',
						description: 'Chat is available only during the meeting',
					},
				],
				default: 'enabled',
				description: 'The mode of the meeting chat',
			},
			{
				displayName: 'Allow Teamwork Reactions',
				name: 'allowTeamworkReactions',
				type: 'boolean',
				default: true,
				description: 'Whether Teams reactions are enabled for the meeting',
			},
			{
				displayName: 'Allowed Presenters',
				name: 'allowedPresenters',
				type: 'options',
				options: [
					{
						name: 'Everyone',
						value: 'everyone',
					},
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Organizer',
						value: 'organizer',
					},
				],
				default: 'everyone',
				description: 'Who can present in the meeting',
			},
			{
				displayName: 'Announce Entry and Exit',
				name: 'isEntryExitAnnounced',
				type: 'boolean',
				default: false,
				description: 'Whether to announce when callers join or leave the meeting',
			},
			{
				displayName: 'Lobby Bypass Scope',
				name: 'lobbyBypassScope',
				type: 'options',
				options: [
					{
						name: 'Everyone',
						value: 'everyone',
					},
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Organization and Federated',
						value: 'organizationAndFederated',
						description: 'People in the organization and guests from trusted organizations',
					},
					{
						name: 'Organizer',
						value: 'organizer',
					},
				],
				default: 'organization',
				description: 'Who can join the meeting without waiting in the lobby',
			},
			{
				displayName: 'Record Automatically',
				name: 'recordAutomatically',
				type: 'boolean',
				default: false,
				description: 'Whether to record the meeting automatically',
			},
			{
				displayName: 'Require Passcode',
				name: 'passcodeRequired',
				type: 'boolean',
				default: false,
				description:
					'Whether a passcode is required to join the meeting by meeting ID. This setting cannot be changed after the meeting is created.',
			},
		],
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

	const subject = this.getNodeParameter('subject', i) as string;
	const startDateTime = this.getNodeParameter('startDateTime', i) as string;
	const endDateTime = this.getNodeParameter('endDateTime', i) as string;
	const options = this.getNodeParameter('options', i);

	const body: IDataObject = {
		subject,
		startDateTime,
		endDateTime,
	};
	if (options.allowAttendeeToEnableCamera !== undefined) {
		body.allowAttendeeToEnableCamera = options.allowAttendeeToEnableCamera as boolean;
	}
	if (options.allowAttendeeToEnableMic !== undefined) {
		body.allowAttendeeToEnableMic = options.allowAttendeeToEnableMic as boolean;
	}
	if (options.allowMeetingChat) {
		body.allowMeetingChat = options.allowMeetingChat as string;
	}
	if (options.allowTeamworkReactions !== undefined) {
		body.allowTeamworkReactions = options.allowTeamworkReactions as boolean;
	}
	if (options.allowedPresenters) {
		body.allowedPresenters = options.allowedPresenters as string;
	}
	if (options.isEntryExitAnnounced !== undefined) {
		body.isEntryExitAnnounced = options.isEntryExitAnnounced as boolean;
	}
	if (options.lobbyBypassScope) {
		body.lobbyBypassSettings = { scope: options.lobbyBypassScope as string };
	}
	if (options.recordAutomatically !== undefined) {
		body.recordAutomatically = options.recordAutomatically as boolean;
	}
	if (options.passcodeRequired !== undefined) {
		body.joinMeetingIdSettings = { isPasscodeRequired: options.passcodeRequired as boolean };
	}

	return await microsoftApiRequest.call(this, 'POST', '/v1.0/me/onlineMeetings', body);
}
