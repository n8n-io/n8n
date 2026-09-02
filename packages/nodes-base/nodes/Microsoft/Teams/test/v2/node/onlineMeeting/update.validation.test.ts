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

	it('sends only the chosen fields', async () => {
		await run({ subject: 'Renamed', allowAttendeeToEnableCamera: false });

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'PATCH',
			endpoint,
			{
				subject: 'Renamed',
				allowAttendeeToEnableCamera: false,
			},
			{},
			undefined,
			meetingHeaders,
		);
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
		const joinWebUrl =
			'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZDE2Nzg0%40thread.v2/0';
		(transport.microsoftApiRequest as Mock)
			.mockResolvedValueOnce({ value: [{ id: meetingId }] })
			.mockResolvedValueOnce({ id: meetingId, subject: 'Renamed' });

		await run({ subject: 'Renamed' }, { __rl: true, mode: 'url', value: joinWebUrl });

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

	it.each([
		['no field is set', {}],
		['only a blank subject is set', { subject: '' }],
	])('throws before any request when %s', async (_label, updateFields) => {
		await expect(run(updateFields)).rejects.toThrow('Add at least one field to update');
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it.each([
		['start', { startDateTime: '2026-09-12T10:00:00Z', endDateTime: '' }],
		['end', { startDateTime: '', endDateTime: '2026-09-12T10:45:00Z' }],
	])('throws before any request when only the %s time is set', async (_label, updateFields) => {
		await expect(run(updateFields)).rejects.toThrow(
			'Start Time and End Time must be updated together',
		);
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('drops a setting that is not offered on Update', async () => {
		await run({ subject: 'Renamed', passcodeRequired: true });

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
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

	it('offers only the properties Graph allows to change after creation', () => {
		const updateFields = versionDescription.properties.find(
			(property) =>
				property.name === 'updateFields' &&
				property.displayOptions?.show?.resource?.includes('onlineMeeting') &&
				property.displayOptions?.show?.operation?.includes('update'),
		);
		const names = (updateFields?.options ?? []).map((option) => option.name);

		expect(new Set(names)).toEqual(
			new Set([
				'allowAttendeeToEnableCamera',
				'allowAttendeeToEnableMic',
				'allowMeetingChat',
				'allowTeamworkReactions',
				'allowedPresenters',
				'endDateTime',
				'isEntryExitAnnounced',
				'lobbyBypassScope',
				'recordAutomatically',
				'startDateTime',
				'subject',
			]),
		);
	});
});
