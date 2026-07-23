import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { Mock } from 'vitest';
import {
	SEND_AND_WAIT_OPERATION,
	type IExecuteFunctions,
	type INode,
	type NodeParameterValueType,
} from 'n8n-workflow';

import { versionDescription } from '../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../v2/MicrosoftTeamsV2.node';
import { SERVICE_PRINCIPAL_AUTH } from '../../../v2/transport';
import * as transport from '../../../v2/transport';
import type * as _importType0 from '../../../v2/transport';

// Real transport except for the network helper, so the real getTeamsCredentialType
// (and thus the SP runtime guards) are exercised; only microsoftApiRequest /
// microsoftApiRequestAllItems are stubbed to assert they are NOT called.
vi.mock('../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
		microsoftApiRequestAllItems: vi.fn(),
	};
});

describe('Microsoft Teams V2 — Service Principal runtime guards', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = mock<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getInstanceId.mockReturnValue('instanceId');
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.continueOnFail.mockReturnValue(false);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// Drives `getNodeParameter` so `authentication` resolves to the SP credential and
	// other reads come from `params` (falling back to the provided fallback arg).
	// `failOnTasksFor` proves the operation never reads `tasksFor` under SP.
	const selectSp = (params: Record<string, unknown>, failOnTasksFor = false) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown): NodeParameterValueType => {
				if (name === 'authentication') return SERVICE_PRINCIPAL_AUTH;
				if (failOnTasksFor && name === 'tasksFor') {
					throw new Error('tasksFor must not be read under the Service Principal credential');
				}
				return (name in params ? params[name] : fallback) as NodeParameterValueType;
			},
		);
	};

	it.each([
		['create', 'create'],
		['get', 'get'],
		['getAll', 'getAll'],
	])('chatMessage:%s throws a static error and issues no request under SP', async (_label, op) => {
		selectSp({ resource: 'chatMessage', operation: op, chatId: 'chatID', returnAll: true });

		await expect(node.execute.call(ctx)).rejects.toThrow(
			'Chat messages are not available with the Service Principal credential',
		);
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
		expect(transport.microsoftApiRequestAllItems).not.toHaveBeenCalled();
	});

	it('chatMessage:sendAndWait throws under SP and NEVER calls putExecutionToWait', async () => {
		selectSp({
			resource: 'chatMessage',
			operation: SEND_AND_WAIT_OPERATION,
			chatId: 'chatID',
			message: 'hi',
			'approvalOptions.values': {},
			responseType: 'approval',
			'options.limitWaitTime.values': {},
		});

		await expect(node.execute.call(ctx)).rejects.toThrow(
			'Chat messages are not available with the Service Principal credential',
		);
		expect(ctx.putExecutionToWait).not.toHaveBeenCalled();
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('channelMessage:create throws a static error and issues no request under SP', async () => {
		selectSp({
			resource: 'channelMessage',
			operation: 'create',
			teamId: 'teamID',
			channelId: 'channelID',
			contentType: 'text',
			message: 'hi',
			options: {},
		});

		await expect(node.execute.call(ctx)).rejects.toThrow(
			'Sending channel messages is not available with the Service Principal credential',
		);
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('channelMessage:getAll under SP hits the exact raw /beta path (colon id, not encoded, no /me)', async () => {
		(transport.microsoftApiRequestAllItems as Mock).mockResolvedValue([{ id: 'm1' }]);
		ctx.helpers.returnJsonArray = vi.fn((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		) as unknown as IExecuteFunctions['helpers']['returnJsonArray'];
		ctx.helpers.constructExecutionMetaData = vi.fn(
			(data) => data,
		) as unknown as IExecuteFunctions['helpers']['constructExecutionMetaData'];
		selectSp({
			resource: 'channelMessage',
			operation: 'getAll',
			teamId: '1111-2222-3333',
			channelId: '19:abc@thread.tacv2',
			returnAll: true,
		});

		await node.execute.call(ctx);

		expect(transport.microsoftApiRequestAllItems).toHaveBeenCalledWith(
			'value',
			'GET',
			'/beta/teams/1111-2222-3333/channels/19:abc@thread.tacv2/messages',
		);
		const calledPath = (transport.microsoftApiRequestAllItems as Mock).mock.calls[0][2] as string;
		expect(calledPath).not.toContain('%3A');
		// no `/me` user-scope segment (the `me` in `/messages` is not a segment)
		expect(calledPath).not.toMatch(/\/me(\/|$)/);
	});

	describe('task:getAll under SP', () => {
		it('forces plan mode, never reads tasksFor, and hits the exact plan-tasks path', async () => {
			(transport.microsoftApiRequestAllItems as Mock).mockResolvedValue([{ id: 't1' }]);
			// Happy path reaches the router's result assembly, so stub these helpers.
			ctx.helpers.returnJsonArray = vi.fn((data) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			) as unknown as IExecuteFunctions['helpers']['returnJsonArray'];
			ctx.helpers.constructExecutionMetaData = vi.fn(
				(data) => data,
			) as unknown as IExecuteFunctions['helpers']['constructExecutionMetaData'];
			selectSp(
				{ resource: 'task', operation: 'getAll', planId: 'plan-123', returnAll: true },
				true,
			);

			await node.execute.call(ctx);

			// Called via `.call(this, ...)`, so the recorded args start at the method's
			// own parameters (the bound `this` is not an argument).
			expect(transport.microsoftApiRequestAllItems).toHaveBeenCalledWith(
				'value',
				'GET',
				'/v1.0/planner/plans/plan-123/tasks',
			);
			// app-only must never hit /me
			const calledPath = (transport.microsoftApiRequestAllItems as Mock).mock.calls[0][2] as string;
			expect(calledPath).not.toContain('/me');
		});

		it('rejects a crafted planId via buildTeamsPath under SP', async () => {
			selectSp({
				resource: 'task',
				operation: 'getAll',
				planId: 'x/../../groups/abc',
				returnAll: true,
			});

			await expect(node.execute.call(ctx)).rejects.toThrow('The ID is not valid');
			expect(transport.microsoftApiRequestAllItems).not.toHaveBeenCalled();
		});
	});

	describe('channel:get under SP composes the proven raw Graph path', () => {
		it('interpolates a real colon-bearing channelId RAW (not percent-encoded)', async () => {
			(transport.microsoftApiRequest as Mock).mockResolvedValue({ id: 'ch' });
			ctx.helpers.returnJsonArray = vi.fn((data) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			) as unknown as IExecuteFunctions['helpers']['returnJsonArray'];
			ctx.helpers.constructExecutionMetaData = vi.fn(
				(data) => data,
			) as unknown as IExecuteFunctions['helpers']['constructExecutionMetaData'];
			selectSp({
				resource: 'channel',
				operation: 'get',
				teamId: '1111-2222-3333',
				channelId: '19:abc@thread.tacv2',
			});

			await node.execute.call(ctx);

			expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				'/v1.0/teams/1111-2222-3333/channels/19:abc@thread.tacv2',
			);
			const calledPath = (transport.microsoftApiRequest as Mock).mock.calls[0][1] as string;
			expect(calledPath).not.toContain('%3A');
			expect(calledPath).not.toContain('%40');
			expect(calledPath).not.toContain('/me');
		});

		it.each(['get', 'deleteChannel'])(
			'channel:%s rejects a separator-bearing channelId before any request',
			async (op) => {
				selectSp({
					resource: 'channel',
					operation: op,
					teamId: '1111-2222-3333',
					channelId: 'x/../../groups/abc',
				});

				// The path (and its validation) is built outside the op's try/catch, so the
				// validator's specific message surfaces instead of the generic "doesn't exist" one.
				await expect(node.execute.call(ctx)).rejects.toThrow('The ID is not valid');
				expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
			},
		);
	});

	describe('task path-id injection under SP', () => {
		it.each(['get', 'deleteTask'])(
			'task:%s rejects a crafted taskId via buildTeamsPath',
			async (op) => {
				selectSp({ resource: 'task', operation: op, taskId: 'x/../../planner/tasks/evil' });

				await expect(node.execute.call(ctx)).rejects.toThrow('The ID is not valid');
				expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
			},
		);
	});

	describe('task body-ID validation under SP (defense-in-depth)', () => {
		it.each([
			['planId', { resource: 'task', operation: 'create', planId: 'p/../x', bucketId: 'b1' }],
			['bucketId', { resource: 'task', operation: 'create', planId: 'p1', bucketId: 'b/../x' }],
		])('task:create rejects a crafted %s before any request', async (_label, params) => {
			selectSp({ ...params, title: 'x', options: {} });

			await expect(node.execute.call(ctx)).rejects.toThrow('The ID is not valid');
			expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
		});

		it('task:update rejects a crafted planId in the update body before any request', async () => {
			// task:update reads updateFields, then per-key reads updateFields.<key>; the body
			// validation runs before the GET/PATCH.
			ctx.getNodeParameter.mockImplementation(
				(name: string, _i?: number, fallback?: unknown): NodeParameterValueType => {
					if (name === 'authentication') return SERVICE_PRINCIPAL_AUTH;
					if (name === 'resource') return 'task';
					if (name === 'operation') return 'update';
					if (name === 'taskId') return 'valid-task-id';
					if (name === 'updateFields') return { planId: 'p/../x' };
					if (name === 'updateFields.planId') return 'p/../x';
					return fallback as NodeParameterValueType;
				},
			);

			await expect(node.execute.call(ctx)).rejects.toThrow('The ID is not valid');
			expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
		});

		it('task:create with a By-ID assignee builds the app-only assignment from the user id', async () => {
			(transport.microsoftApiRequest as Mock).mockResolvedValue({ id: 'task-1' });
			ctx.helpers.returnJsonArray = vi.fn((data) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			) as unknown as IExecuteFunctions['helpers']['returnJsonArray'];
			ctx.helpers.constructExecutionMetaData = vi.fn(
				(data) => data,
			) as unknown as IExecuteFunctions['helpers']['constructExecutionMetaData'];
			selectSp({
				resource: 'task',
				operation: 'create',
				planId: 'plan-1',
				bucketId: 'bucket-1',
				title: 'My task',
				options: { assignedTo: 'user-guid-123' },
				'options.assignedTo': 'user-guid-123',
			});

			await node.execute.call(ctx);

			expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
				'POST',
				'/v1.0/planner/tasks',
				expect.objectContaining({
					planId: 'plan-1',
					bucketId: 'bucket-1',
					title: 'My task',
					assignments: {
						'user-guid-123': {
							'@odata.type': 'microsoft.graph.plannerAssignment',
							orderHint: ' !',
						},
					},
				}),
			);
		});
	});

	describe('empty-ID validation under SP', () => {
		it('channel:get with an empty channelId throws "A required ID is empty" before any request', async () => {
			selectSp({
				resource: 'channel',
				operation: 'get',
				teamId: '1111-2222-3333',
				channelId: '',
			});

			await expect(node.execute.call(ctx)).rejects.toThrow('A required ID is empty');
			expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('channelMessage:getAll under SP with returnAll:false', () => {
		it('hits the same /beta/.../messages endpoint (limit path)', async () => {
			(transport.microsoftApiRequestAllItems as Mock).mockResolvedValue([
				{ id: 'm1' },
				{ id: 'm2' },
			]);
			ctx.helpers.returnJsonArray = vi.fn((data) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			) as unknown as IExecuteFunctions['helpers']['returnJsonArray'];
			ctx.helpers.constructExecutionMetaData = vi.fn(
				(data) => data,
			) as unknown as IExecuteFunctions['helpers']['constructExecutionMetaData'];
			selectSp({
				resource: 'channelMessage',
				operation: 'getAll',
				teamId: '1111-2222-3333',
				channelId: '19:abc@thread.tacv2',
				returnAll: false,
				limit: 1,
			});

			await node.execute.call(ctx);

			expect(transport.microsoftApiRequestAllItems).toHaveBeenCalledWith(
				'value',
				'GET',
				'/beta/teams/1111-2222-3333/channels/19:abc@thread.tacv2/messages',
				{},
			);
		});
	});
});
