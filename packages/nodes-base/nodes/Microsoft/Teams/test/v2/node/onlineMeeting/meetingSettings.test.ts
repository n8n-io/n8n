import type { IDataObject } from 'n8n-workflow';

import {
	applyMeetingSettings,
	meetingSettingsProperties,
	withMeetingSettings,
} from '../../../../v2/actions/onlineMeeting/meetingSettings';

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
		[{}, {}],
		[{ passcodeRequired: true }, {}],
	])('maps %j to %j', (settings, expected) => {
		const body: IDataObject = {};

		applyMeetingSettings(body, settings);

		expect(body).toEqual(expected);
	});

	it('sorts the shared settings together with the extra fields', () => {
		const names = withMeetingSettings([
			{ displayName: 'Subject', name: 'subject', type: 'string', default: '' },
			{ displayName: 'Allow Everything', name: 'allowEverything', type: 'boolean', default: true },
		]).map((property) => property.displayName);

		expect(names).toEqual(
			[
				...meetingSettingsProperties.map((property) => property.displayName),
				'Subject',
				'Allow Everything',
			].sort((a, b) => a.localeCompare(b)),
		);
	});
});
