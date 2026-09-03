import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { createExecuteContext, setParams } from '../helpers';
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

const operations: Array<[string, Record<string, unknown>, string]> = [['get', {}, 'get']];

describe('Microsoft Teams V2 — onlineMeeting by-ID operations', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = createExecuteContext();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const run = async (operation: string, params: Record<string, unknown>, meetingId: string) => {
		setParams(ctx, { resource: 'onlineMeeting', operation, meetingId, ...params });
		return await node.execute.call(ctx);
	};

	it.each(operations)('%s rejects an empty meeting ID before any request', async (op, params) => {
		await expect(run(op, params, '')).rejects.toThrow('A required ID is empty');
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it.each(operations)(
		'%s rejects a separator-bearing meeting ID before any request',
		async (op, params) => {
			await expect(run(op, params, 'x/../../users/evil')).rejects.toThrow('The ID is not valid');
			expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
		},
	);

	it.each(operations)(
		'%s replaces a Graph 404 with the not-found message',
		async (op, params, verb) => {
			(transport.microsoftApiRequest as Mock).mockRejectedValue(
				new NodeApiError(ctx.getNode(), { message: 'Not Found' }, { httpCode: '404' }),
			);

			await expect(run(op, params, 'MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi')).rejects.toThrow(
				`The meeting you are trying to ${verb} doesn't exist`,
			);
		},
	);

	it.each(operations)('%s rethrows a non-404 Graph error unchanged', async (op, params) => {
		(transport.microsoftApiRequest as Mock).mockRejectedValue(
			new NodeApiError(
				ctx.getNode(),
				{ message: 'Insufficient privileges to complete the operation' },
				{ httpCode: '403', message: 'Insufficient privileges to complete the operation' },
			),
		);

		await expect(run(op, params, 'MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi')).rejects.toThrow(
			'Insufficient privileges to complete the operation',
		);
	});
});
