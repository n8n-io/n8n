import type { IDataObject, INodeProperties } from 'n8n-workflow';

const lobbyBypassScope: INodeProperties = {
	displayName: 'Lobby Bypass Scope',
	name: 'lobbyBypassScope',
	type: 'options',
	options: [
		{
			name: 'Everyone',
			value: 'everyone',
		},
		{
			name: 'Invited',
			value: 'invited',
			description: 'Only people the organizer invited',
		},
		{
			name: 'Organization',
			value: 'organization',
			description: 'People in the organization and guests',
		},
		{
			name: 'Organization and Federated',
			value: 'organizationAndFederated',
			description: 'People in the organization and guests from trusted organizations',
		},
		{
			name: 'Organization Excluding Guests',
			value: 'organizationExcludingGuests',
			description: 'People in the organization, without guests',
		},
		{
			name: 'Organizer',
			value: 'organizer',
		},
	],
	default: 'organization',
	description: 'Who can join the meeting without waiting in the lobby',
};

const meetingSettingsProperties: readonly INodeProperties[] = [
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
	lobbyBypassScope,
	{
		displayName: 'Record Automatically',
		name: 'recordAutomatically',
		type: 'boolean',
		default: false,
		description: 'Whether to record the meeting automatically',
	},
];

const isSet = (value: unknown) => value !== undefined && value !== null && value !== '';

export function applyMeetingSettings(body: IDataObject, settings: IDataObject): void {
	for (const { name } of meetingSettingsProperties) {
		const value = settings[name];
		if (!isSet(value)) continue;
		if (name === lobbyBypassScope.name) {
			body.lobbyBypassSettings = { scope: value };
		} else {
			body[name] = value;
		}
	}
}

export const withMeetingSettings = (extra: readonly INodeProperties[]): INodeProperties[] =>
	[...meetingSettingsProperties, ...extra].sort((a, b) =>
		a.displayName.localeCompare(b.displayName, 'en'),
	);
