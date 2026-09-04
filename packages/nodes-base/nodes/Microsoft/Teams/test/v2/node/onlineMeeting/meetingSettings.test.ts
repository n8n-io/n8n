import type { IDataObject } from 'n8n-workflow';

import {
	applyMeetingSettings,
	withMeetingSettings,
} from '../../../../v2/actions/onlineMeeting/meetingSettings';
import { versionDescription } from '../../../../v2/actions/versionDescription';

describe('Microsoft Teams V2 — onlineMeeting meeting settings', () => {
	it.each<[IDataObject, IDataObject]>([
		[{ allowAttendeeToEnableCamera: false }, { allowAttendeeToEnableCamera: false }],
		[{ allowAttendeeToEnableMic: false }, { allowAttendeeToEnableMic: false }],
		[{ allowMeetingChat: 'limited' }, { allowMeetingChat: 'limited' }],
		[{ allowTeamworkReactions: false }, { allowTeamworkReactions: false }],
		[{ allowedPresenters: 'organizer' }, { allowedPresenters: 'organizer' }],
		[{ isEntryExitAnnounced: true }, { isEntryExitAnnounced: true }],
		[{ lobbyBypassScope: 'invited' }, { lobbyBypassSettings: { scope: 'invited' } }],
		[{ recordAutomatically: false }, { recordAutomatically: false }],
		[
			{ allowAttendeeToEnableCamera: false, lobbyBypassScope: 'everyone' },
			{ allowAttendeeToEnableCamera: false, lobbyBypassSettings: { scope: 'everyone' } },
		],
		[{ allowMeetingChat: '' }, {}],
		[{ allowMeetingChat: null }, {}],
		[{ allowAttendeeToEnableCamera: '' }, {}],
		[{ allowAttendeeToEnableCamera: null }, {}],
		[{ lobbyBypassScope: '' }, {}],
		[{}, {}],
		[{ passcodeRequired: true }, {}],
	])('maps %j to %j', (settings, expected) => {
		const body: IDataObject = {};

		applyMeetingSettings(body, settings);

		expect(body).toStrictEqual(expected);
	});

	it('interleaves the extra fields with the shared settings in display order', () => {
		const names = withMeetingSettings([
			{ displayName: 'Subject', name: 'subject', type: 'string', default: '' },
			{ displayName: 'End Time', name: 'endDateTime', type: 'dateTime', default: '' },
		]).map((property) => property.displayName);

		expect(names).toEqual([
			'Allow Attendees to Enable Camera',
			'Allow Attendees to Enable Microphone',
			'Allow Meeting Chat',
			'Allow Teamwork Reactions',
			'Allowed Presenters',
			'Announce Entry and Exit',
			'End Time',
			'Lobby Bypass Scope',
			'Record Automatically',
			'Subject',
		]);
	});

	it('offers the shared settings and Require Passcode on Create in display order', () => {
		const options = versionDescription.properties.find(
			(property) =>
				property.name === 'options' &&
				property.displayOptions?.show?.resource?.includes('onlineMeeting') &&
				property.displayOptions?.show?.operation?.includes('create'),
		);
		const names = (options?.options ?? []).map((option) => option.name);

		expect(names).toEqual([
			'allowAttendeeToEnableCamera',
			'allowAttendeeToEnableMic',
			'allowMeetingChat',
			'allowTeamworkReactions',
			'allowedPresenters',
			'isEntryExitAnnounced',
			'lobbyBypassScope',
			'recordAutomatically',
			'passcodeRequired',
		]);
	});
});
