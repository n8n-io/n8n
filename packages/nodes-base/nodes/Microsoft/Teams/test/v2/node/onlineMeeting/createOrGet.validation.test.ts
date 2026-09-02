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

	it('sends a start time in UTC without an end time', async () => {
		ctx.getTimezone.mockReturnValue('Europe/Berlin');

		await run('order-4711', { startDateTime: '2026-09-15T09:00:00' });

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'POST',
			endpoint,
			{
				externalId: 'order-4711',
				startDateTime: '2026-09-15T07:00:00Z',
			},
			{},
			undefined,
			meetingHeaders,
		);
	});

	it('throws before any request when the external ID is blank', async () => {
		await expect(run('   ')).rejects.toThrow('The External ID must not be empty');
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('throws before any request when an end time is set without a start time', async () => {
		await expect(run('order-4711', { endDateTime: '2026-09-15T09:30:00Z' })).rejects.toThrow(
			'End Time requires a Start Time',
		);
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});
});
