import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import type { IExecuteFunctions, NodeParameterValueType } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { createExecuteContext, meetingHeaders, setParams } from '../helpers';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import { SERVICE_PRINCIPAL_AUTH } from '../../../../v2/transport';
import * as transport from '../../../../v2/transport';
import type * as _importType0 from '../../../../v2/transport';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const ORGANIZER = '11111111-2222-3333-4444-555555555555';
const MEETING = 'MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi';
const JOIN_URL = 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZDE2Nzg0%40thread.v2/0';
const MEETINGS = `/v1.0/users/${ORGANIZER}/onlineMeetings`;

const byId = { meetingId: { __rl: true, mode: 'id', value: MEETING } };
const byUrl = { meetingId: { __rl: true, mode: 'url', value: JOIN_URL } };

const createParams = {
	subject: 'Sync',
	startDateTime: '2026-09-10T10:00:00Z',
	endDateTime: '2026-09-10T10:30:00Z',
	options: {},
};

describe('Microsoft Teams V2 — onlineMeeting under the Service Principal credential', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = createExecuteContext();
		(transport.microsoftApiRequest as Mock).mockResolvedValue({ id: MEETING });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const run = async (operation: string, params: Record<string, unknown>) => {
		setParams(ctx, {
			authentication: SERVICE_PRINCIPAL_AUTH,
			resource: 'onlineMeeting',
			operation,
			organizerId: ORGANIZER,
			...params,
		});
		return await node.execute.call(ctx);
	};

	it.each([
		['create', createParams, 'POST', MEETINGS],
		['get', byId, 'GET', `${MEETINGS}/${MEETING}`],
	])(
		"%s addresses the organizer's meetings instead of /me",
		async (operation, params, method, path) => {
			await run(operation, params);

			expect(transport.microsoftApiRequest).toHaveBeenCalledTimes(1);
			expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
				method,
				path,
				expect.anything(),
				expect.anything(),
				undefined,
				meetingHeaders,
			);
		},
	);

	it("get by join URL filters the organizer's meetings", async () => {
		(transport.microsoftApiRequest as Mock).mockResolvedValue({ value: [{ id: MEETING }] });

		await run('get', byUrl);

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'GET',
			MEETINGS,
			{},
			{ $filter: `JoinWebUrl eq '${JOIN_URL}'` },
			undefined,
			meetingHeaders,
		);
	});

	it('keeps the not-found rewrite for a 404 on a meeting, naming both parameters', async () => {
		(transport.microsoftApiRequest as Mock).mockRejectedValue(
			new NodeApiError(ctx.getNode(), { message: 'Not Found' }, { httpCode: '404' }),
		);

		const thrown: unknown = await run('get', byId).catch((error: unknown) => error);

		expect(thrown).toBeInstanceOf(NodeOperationError);
		expect((thrown as NodeOperationError).message).toBe(
			"The meeting you are trying to get doesn't exist",
		);
		expect((thrown as NodeOperationError).description).toBe(
			"Check that the 'Meeting' and 'Organizer' parameters are correctly set",
		);
	});

	it('leaves a delegated 403 unchanged', async () => {
		(transport.microsoftApiRequest as Mock).mockRejectedValue(
			new NodeApiError(
				ctx.getNode(),
				{ message: 'Insufficient privileges to complete the operation' },
				{ httpCode: '403', message: 'Insufficient privileges to complete the operation' },
			),
		);
		setParams(ctx, { resource: 'onlineMeeting', operation: 'get', ...byId });

		await expect(node.execute.call(ctx)).rejects.toThrow(
			'Insufficient privileges to complete the operation',
		);
		const calledPath = (transport.microsoftApiRequest as Mock).mock.calls[0][1] as string;
		expect(calledPath).toBe(`/v1.0/me/onlineMeetings/${MEETING}`);
	});

	describe('a user principal name as the organizer', () => {
		it('is resolved to the object ID before the meeting request', async () => {
			(transport.microsoftApiRequest as Mock)
				.mockResolvedValueOnce({ id: ORGANIZER })
				.mockResolvedValueOnce({ id: MEETING });

			await run('create', { ...createParams, organizerId: 'alex@contoso.com' });

			expect(transport.microsoftApiRequest).toHaveBeenNthCalledWith(
				1,
				'GET',
				'/v1.0/users/alex@contoso.com',
				{},
				{ $select: 'id' },
			);
			expect(transport.microsoftApiRequest).toHaveBeenNthCalledWith(
				2,
				'POST',
				MEETINGS,
				expect.anything(),
				expect.anything(),
				undefined,
				meetingHeaders,
			);
		});

		it('reports an unknown principal name as an organizer problem', async () => {
			(transport.microsoftApiRequest as Mock).mockRejectedValue(
				new NodeApiError(ctx.getNode(), { message: 'Not Found' }, { httpCode: '404' }),
			);

			await expect(
				run('create', { ...createParams, organizerId: 'nobody@contoso.com' }),
			).rejects.toThrow('Organizer not found');
			expect(transport.microsoftApiRequest).toHaveBeenCalledTimes(1);
		});

		it('names User.Read.All when the lookup is forbidden', async () => {
			(transport.microsoftApiRequest as Mock).mockRejectedValue(
				new NodeApiError(ctx.getNode(), { message: 'Forbidden' }, { httpCode: '403' }),
			);

			const thrown: unknown = await run('create', {
				...createParams,
				organizerId: 'alex@contoso.com',
			}).catch((error: unknown) => error);

			expect(thrown).toBeInstanceOf(NodeApiError);
			expect((thrown as NodeApiError).message).toContain('User.Read.All');
			expect((thrown as NodeApiError).message).toContain('object ID');
		});

		it('stamps the failing item on a lookup error for a later item', async () => {
			const organizers = [ORGANIZER, 'alex@contoso.com'];
			ctx.getInputData.mockReturnValue(organizers.map(() => ({ json: {} })));
			const params: Record<string, unknown> = {
				authentication: SERVICE_PRINCIPAL_AUTH,
				resource: 'onlineMeeting',
				operation: 'create',
				...createParams,
			};
			ctx.getNodeParameter.mockImplementation(
				(name: string, itemIndex?: number, fallback?: unknown): NodeParameterValueType => {
					if (name === 'organizerId') return organizers[itemIndex ?? 0];
					return (name in params ? params[name] : fallback) as NodeParameterValueType;
				},
			);
			(transport.microsoftApiRequest as Mock)
				.mockResolvedValueOnce({ id: MEETING })
				.mockRejectedValueOnce(
					new NodeApiError(ctx.getNode(), { message: 'Forbidden' }, { httpCode: '403' }),
				);

			const thrown: unknown = await node.execute.call(ctx).catch((error: unknown) => error);

			expect(thrown).toBeInstanceOf(NodeApiError);
			expect((thrown as NodeApiError).context.itemIndex).toBe(1);
		});
	});

	it('resolves the organizer per item and isolates a blank one under continueOnFail', async () => {
		const organizers = [ORGANIZER, '', '22222222-3333-4444-5555-666666666666'];
		ctx.getInputData.mockReturnValue(organizers.map(() => ({ json: {} })));
		ctx.continueOnFail.mockReturnValue(true);
		const params: Record<string, unknown> = {
			authentication: SERVICE_PRINCIPAL_AUTH,
			resource: 'onlineMeeting',
			operation: 'create',
			...createParams,
		};
		ctx.getNodeParameter.mockImplementation(
			(name: string, itemIndex?: number, fallback?: unknown): NodeParameterValueType => {
				if (name === 'organizerId') return organizers[itemIndex ?? 0];
				return (name in params ? params[name] : fallback) as NodeParameterValueType;
			},
		);

		const [output] = await node.execute.call(ctx);

		expect(output.map((item) => item.json)).toEqual([
			{ id: MEETING },
			{ error: 'The Organizer is required with the Service Principal credential' },
			{ id: MEETING },
		]);
		const paths = (transport.microsoftApiRequest as Mock).mock.calls.map((call) => call[1]);
		expect(paths).toEqual([MEETINGS, `/v1.0/users/${organizers[2]}/onlineMeetings`]);
	});

	it.each([
		['missing', undefined],
		['blank', '   '],
	])('rejects a %s organizer before any request', async (_label, organizerId) => {
		const thrown: unknown = await run('create', { ...createParams, organizerId }).catch(
			(error: unknown) => error,
		);

		expect(thrown).toBeInstanceOf(NodeOperationError);
		expect((thrown as NodeOperationError).message).toBe(
			'The Organizer is required with the Service Principal credential',
		);
		expect((thrown as NodeOperationError).context.itemIndex).toBe(0);
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('rejects a separator-bearing organizer before any request', async () => {
		await expect(run('create', { ...createParams, organizerId: 'x/../../me' })).rejects.toThrow(
			'The ID is not valid',
		);
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it.each([
		['create', createParams],
		['get', byId],
	])('%s names the access policy setup when Graph answers 403', async (operation, params) => {
		(transport.microsoftApiRequest as Mock).mockRejectedValue(
			new NodeApiError(ctx.getNode(), { message: 'Forbidden' }, { httpCode: '403' }),
		);

		const thrown: unknown = await run(operation, params).catch((error: unknown) => error);

		expect(thrown).toBeInstanceOf(NodeApiError);
		expect((thrown as NodeApiError).httpCode).toBe('403');
		expect((thrown as NodeApiError).context.itemIndex).toBe(0);
		// the message alone must be actionable: continueOnFail emits only the message
		const message = (thrown as NodeApiError).message;
		expect(message).toContain('Microsoft Graph refused the app-only meeting request');
		expect(message).toContain('OnlineMeetings.ReadWrite.All');
		expect(message).toContain('New-CsApplicationAccessPolicy');
		expect(message).toContain('Grant-CsApplicationAccessPolicy');
		expect((thrown as NodeApiError).description).toContain('30 minutes');
	});

	it.each([
		['create', createParams],
		['get by join URL', byUrl],
	])(
		'%s reports a 404 on the meetings collection as an unknown organizer',
		async (operation, params) => {
			(transport.microsoftApiRequest as Mock).mockRejectedValue(
				new NodeApiError(ctx.getNode(), { message: 'Not Found' }, { httpCode: '404' }),
			);

			await expect(run(operation === 'create' ? 'create' : 'get', params)).rejects.toThrow(
				'Organizer not found',
			);
		},
	);
});
