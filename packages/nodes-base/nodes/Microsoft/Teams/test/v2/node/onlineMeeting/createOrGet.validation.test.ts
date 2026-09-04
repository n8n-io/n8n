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

describe('Microsoft Teams V2 — onlineMeeting:createOrGet', () => {
	const endpoint = '/v1.0/me/onlineMeetings/createOrGet';
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = createExecuteContext();
		(transport.microsoftApiRequest as Mock).mockResolvedValue({ id: 'meeting-1' });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const run = async (externalId: unknown, options: Record<string, unknown> = {}) => {
		setParams(ctx, { resource: 'onlineMeeting', operation: 'createOrGet', externalId, options });
		return await node.execute.call(ctx);
	};

	it('sends only the trimmed external ID when no option is set', async () => {
		const result = await run(' order-4711 ');

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'POST',
			endpoint,
			{
				externalId: 'order-4711',
			},
			{},
			undefined,
			meetingHeaders,
		);
		expect(result).toEqual([[{ json: { id: 'meeting-1' }, pairedItem: { item: 0 } }]]);
	});

	it.each<[string, Record<string, unknown>, Record<string, unknown>]>([
		[
			'a start time without an end time',
			{ startDateTime: '2026-09-15T09:00:00' },
			{ startDateTime: '2026-09-15T07:00:00Z' },
		],
		[
			'both times',
			{ startDateTime: '2026-09-15T09:00:00', endDateTime: '2026-09-15T09:30:00' },
			{ startDateTime: '2026-09-15T07:00:00Z', endDateTime: '2026-09-15T07:30:00Z' },
		],
	])('sends %s in UTC', async (_label, options, times) => {
		ctx.getTimezone.mockReturnValue('Europe/Berlin');

		await run('order-4711', options);

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'POST',
			endpoint,
			{ externalId: 'order-4711', ...times },
			{},
			undefined,
			meetingHeaders,
		);
	});

	it.each<[string, unknown, Record<string, unknown>, string]>([
		['the external ID is blank', '   ', {}, 'The External ID must not be empty'],
		['the external ID is an object', { id: 4711 }, {}, 'The External ID must be text'],
		[
			'the subject is an object',
			'order-4711',
			{ subject: { title: 'Kickoff' } },
			'The Subject must be text',
		],
		[
			'an end time is set without a start time',
			'order-4711',
			{ endDateTime: '2026-09-15T09:30:00Z' },
			'End Time requires a Start Time',
		],
		[
			'an end time is set with a blank start time',
			'order-4711',
			{ startDateTime: '', endDateTime: '2026-09-15T09:30:00Z' },
			'End Time requires a Start Time',
		],
	])('throws before any request when %s', async (_label, externalId, options, message) => {
		await expect(run(externalId, options)).rejects.toThrow(message);
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it.each<[string, Record<string, unknown>]>([
		['Start Time', { startDateTime: 'tomorrow' }],
		['End Time', { startDateTime: '2026-09-15T09:00:00Z', endDateTime: 'tomorrow' }],
	])('throws before any request when the %s is not a date', async (label, options) => {
		await expect(run('order-4711', options)).rejects.toThrow(`The ${label} is not a valid date`);
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it.each<[string, Record<string, unknown>, Record<string, unknown>]>([
		[
			'a blank end time',
			{ startDateTime: '2026-09-15T09:00:00Z', endDateTime: '' },
			{ startDateTime: '2026-09-15T09:00:00Z' },
		],
		['blank times and a blank subject', { subject: '', startDateTime: '', endDateTime: '' }, {}],
		['a whitespace subject', { subject: '   ' }, {}],
		['the padding around the subject', { subject: '  Kickoff  ' }, { subject: 'Kickoff' }],
	])('drops %s from the body', async (_label, options, sent) => {
		await run('order-4711', options);

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'POST',
			endpoint,
			{ externalId: 'order-4711', ...sent },
			{},
			undefined,
			meetingHeaders,
		);
	});

	it('offers only the subject and the two times as options', () => {
		const options = versionDescription.properties.find(
			(property) =>
				property.name === 'options' &&
				property.displayOptions?.show?.resource?.includes('onlineMeeting') &&
				property.displayOptions?.show?.operation?.includes('createOrGet'),
		);
		const names = (options?.options ?? []).map((option) => option.name);

		expect(names).toEqual(['endDateTime', 'startDateTime', 'subject']);
	});
});
