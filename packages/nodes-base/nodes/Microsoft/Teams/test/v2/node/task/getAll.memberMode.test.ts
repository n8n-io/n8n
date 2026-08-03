import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { Mock } from 'vitest';
import type { IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';

import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import * as transport from '../../../../v2/transport';
import type * as _importType0 from '../../../../v2/transport';

// OAuth2 task:getAll member-mode regression lock. Mirrors the SP "forces plan, never
// reads tasksFor" test: under OAuth2 with tasksFor='member' the operation MUST read
// `tasksFor`, resolve the signed-in user via /v1.0/me, then list that user's tasks.
vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
		microsoftApiRequestAllItems: vi.fn(),
	};
});

describe('Test MicrosoftTeamsV2, task => getAll (OAuth2 member mode)', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = mock<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getInstanceId.mockReturnValue('instanceId');
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.continueOnFail.mockReturnValue(false);
		ctx.helpers.returnJsonArray = vi.fn((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		) as unknown as IExecuteFunctions['helpers']['returnJsonArray'];
		ctx.helpers.constructExecutionMetaData = vi.fn(
			(data) => data,
		) as unknown as IExecuteFunctions['helpers']['constructExecutionMetaData'];
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('reads tasksFor and composes the member-mode endpoint under OAuth2', async () => {
		(transport.microsoftApiRequest as Mock).mockResolvedValue({ id: 'me-123' });
		(transport.microsoftApiRequestAllItems as Mock).mockResolvedValue([{ id: 't1' }]);

		const params: Record<string, unknown> = {
			resource: 'task',
			operation: 'getAll',
			authentication: 'microsoftTeamsOAuth2Api',
			tasksFor: 'member',
			returnAll: true,
		};
		let readTasksFor = false;
		ctx.getNodeParameter.mockImplementation(
			(name: string, _i?: number, fallback?: unknown): NodeParameterValueType => {
				if (name === 'tasksFor') readTasksFor = true;
				return (name in params ? params[name] : fallback) as NodeParameterValueType;
			},
		);

		await node.execute.call(ctx);

		// the OAuth2 member path MUST read tasksFor (the mirror of the SP "never reads it")
		expect(readTasksFor).toBe(true);
		// resolves the signed-in user, then lists that user's tasks
		expect(transport.microsoftApiRequest).toHaveBeenCalledWith('GET', '/v1.0/me');
		expect(transport.microsoftApiRequestAllItems).toHaveBeenCalledWith(
			'value',
			'GET',
			'/v1.0/users/me-123/planner/tasks',
		);
	});
});
