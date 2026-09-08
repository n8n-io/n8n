import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { createExecuteContext, meetingHeaders, setParams } from '../helpers';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import * as transport from '../../../../v2/transport';
import type * as _importType0 from '../../../../v2/transport';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

describe('Microsoft Teams V2 — onlineMeeting:update', () => {
	const meetingId = 'MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi';
	const endpoint = `/v1.0/me/onlineMeetings/${meetingId}`;
	const joinWebUrl =
		'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZDE2Nzg0%40thread.v2/0';
	const byUrl = { __rl: true, mode: 'url', value: joinWebUrl };
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = createExecuteContext();
		(transport.microsoftApiRequest as Mock).mockResolvedValue({ id: meetingId });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const run = async (updateFields: Record<string, unknown>, id: unknown = meetingId) => {
		setParams(ctx, { resource: 'onlineMeeting', operation: 'update', meetingId: id, updateFields });
		return await node.execute.call(ctx);
	};

	it.each<[string, Record<string, unknown>]>([
		['a subject and a false setting', { subject: 'Renamed', allowAttendeeToEnableCamera: false }],
		['only a false setting', { recordAutomatically: false }],
	])('sends only the chosen fields when %s is set', async (_label, updateFields) => {
		await run(updateFields);

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'PATCH',
			endpoint,
			updateFields,
			{},
			undefined,
			meetingHeaders,
		);
	});

	it('sends the trimmed subject', async () => {
		await run({ subject: '  Renamed  ' });

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'PATCH',
			endpoint,
			{ subject: 'Renamed' },
			{},
			undefined,
			meetingHeaders,
		);
	});

	it('throws before any request when the subject is an object', async () => {
		await expect(run({ subject: { title: 'Renamed' } })).rejects.toThrow(
			'The Subject must be text',
		);
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('sends both times in UTC', async () => {
		ctx.getTimezone.mockReturnValue('Europe/Berlin');

		await run({ startDateTime: '2026-09-12T10:00:00', endDateTime: '2026-09-12T10:45:00' });

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'PATCH',
			endpoint,
			{
				startDateTime: '2026-09-12T08:00:00Z',
				endDateTime: '2026-09-12T08:45:00Z',
			},
			{},
			undefined,
			meetingHeaders,
		);
	});

	it('looks the meeting up by join URL and patches the returned ID', async () => {
		(transport.microsoftApiRequest as Mock)
			.mockResolvedValueOnce({ value: [{ id: meetingId }] })
			.mockResolvedValueOnce({ id: meetingId, subject: 'Renamed' });

		await run({ subject: 'Renamed' }, byUrl);

		expect(transport.microsoftApiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/v1.0/me/onlineMeetings',
			{},
			{ $filter: `JoinWebUrl eq '${joinWebUrl}'` },
			undefined,
			meetingHeaders,
		);
		expect(transport.microsoftApiRequest).toHaveBeenNthCalledWith(
			2,
			'PATCH',
			endpoint,
			{
				subject: 'Renamed',
			},
			{},
			undefined,
			meetingHeaders,
		);
	});

	it.each<[string, Record<string, unknown>, unknown]>([
		['no field is set', {}, meetingId],
		['only a blank subject is set', { subject: '' }, meetingId],
		['only a whitespace subject is set', { subject: '   ' }, meetingId],
		['only a blank setting is set', { allowMeetingChat: '' }, meetingId],
		['only a null setting is set', { lobbyBypassScope: null }, meetingId],
		['no field is set and the meeting is chosen by URL', {}, byUrl],
	])('throws before any request when %s', async (_label, updateFields, id) => {
		await expect(run(updateFields, id)).rejects.toThrow('No fields are set to update');
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it.each<[string, Record<string, unknown>, unknown]>([
		[
			'only the start time is set',
			{ startDateTime: '2026-09-12T10:00:00Z', endDateTime: '' },
			meetingId,
		],
		[
			'only the end time is set',
			{ startDateTime: '', endDateTime: '2026-09-12T10:45:00Z' },
			meetingId,
		],
		[
			'only the start time is set and the meeting is chosen by URL',
			{ startDateTime: '2026-09-12T10:00:00Z', endDateTime: '' },
			byUrl,
		],
	])('throws before any request when %s', async (_label, updateFields, id) => {
		await expect(run(updateFields, id)).rejects.toThrow(
			'Start Time and End Time must be updated together',
		);
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('offers only the properties Graph allows to change after creation', () => {
		const updateFields = versionDescription.properties.find(
			(property) =>
				property.name === 'updateFields' &&
				property.displayOptions?.show?.resource?.includes('onlineMeeting') &&
				property.displayOptions?.show?.operation?.includes('update'),
		);
		const names = (updateFields?.options ?? []).map((option) => option.name);

		expect(names).toEqual([
			'allowAttendeeToEnableCamera',
			'allowAttendeeToEnableMic',
			'allowMeetingChat',
			'allowTeamworkReactions',
			'allowedPresenters',
			'isEntryExitAnnounced',
			'endDateTime',
			'lobbyBypassScope',
			'recordAutomatically',
			'startDateTime',
			'subject',
		]);
	});
});
