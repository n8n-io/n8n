import type { IDataObject, IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { versionDescription } from '../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../v2/MicrosoftTeamsV2.node';
import * as transport from '../../../v2/transport';
import type * as _importType0 from '../../../v2/transport';

// Real transport except the network helper, so the operation runs for real.
vi.mock('../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const USERS: Record<string, IDataObject> = {
	'/v1.0/users/jane%40example.com': { id: 'guid-1', displayName: 'Jane Smith' },
	'/v1.0/users/bob%40example.com': { id: 'guid-2', displayName: 'Bob Jones' },
};

describe('Microsoft Teams V2, create per item', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	/** One execute context, i.e. one node run. The mention cache lives and dies with it. */
	const newCtx = () => {
		const fresh = mock<IExecuteFunctions>();
		fresh.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		fresh.getInstanceId.mockReturnValue('instanceId');
		fresh.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		fresh.continueOnFail.mockReturnValue(false);
		fresh.helpers.returnJsonArray = vi.fn((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		) as unknown as IExecuteFunctions['helpers']['returnJsonArray'];
		fresh.helpers.constructExecutionMetaData = vi.fn(
			(data) => data,
		) as unknown as IExecuteFunctions['helpers']['constructExecutionMetaData'];
		return fresh;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = newCtx();
	});

	const RESOURCES: Array<[string, IDataObject]> = [
		['channelMessage', { teamId: 'teamID', channelId: 'channelID' }],
		['chatMessage', { chatId: 'chatID' }],
	];

	/** Runs both input items through `create` and returns the `body.content` of each POST. */
	const runCreate = async (
		resource: string,
		target: IDataObject,
		mentionedPerItem: string[],
		options: IDataObject = { includeLinkToWorkflow: false },
		graph: (method: string, resourcePath: string) => Promise<IDataObject> = async (
			_method,
			resourcePath,
		) => (resourcePath in USERS ? USERS[resourcePath] : { id: 'sent' }),
	) => {
		const params: Record<string, unknown> = {
			authentication: 'microsoftTeamsOAuth2Api',
			resource,
			operation: 'create',
			...target,
			contentType: 'text',
			message: 'hi',
			options,
			'mentions.mention': [{}],
		};
		ctx.getNodeParameter.mockImplementation(
			(name: string, itemIndex?: number, fallback?: unknown): NodeParameterValueType => {
				if (name === 'mentions.mention[0].userId') {
					return mentionedPerItem[itemIndex as number];
				}
				return (name in params ? params[name] : fallback) as NodeParameterValueType;
			},
		);
		apiRequest.mockImplementation(graph);

		await node.execute.call(ctx);

		return apiRequest.mock.calls
			.filter((call) => call[0] === 'POST')
			.map((call) => (call[2] as { body: { content: string } }).body.content);
	};

	it.each(RESOURCES)(
		'%s create mentions the user configured on each item',
		async (resource, target) => {
			const sent = await runCreate(resource, target, ['jane@example.com', 'bob@example.com']);

			expect(sent).toEqual(['<at id="0">Jane Smith</at> hi', '<at id="0">Bob Jones</at> hi']);
		},
	);

	// Pins the operation reading `options.mentionPlacement`. Without this a renamed key would
	// silently fall back to `start` and every other test would still pass.
	it.each(RESOURCES)('%s create honours the Mention Placement option', async (resource, target) => {
		const sent = await runCreate(resource, target, ['jane@example.com', 'bob@example.com'], {
			includeLinkToWorkflow: false,
			mentionPlacement: 'end',
		});

		expect(sent).toEqual(['hi <at id="0">Jane Smith</at>', 'hi <at id="0">Bob Jones</at>']);
	});

	const janeLookups = () =>
		apiRequest.mock.calls.filter((call) => call[1] === '/v1.0/users/jane%40example.com');

	it.each(RESOURCES)(
		'%s create resolves a repeated mention once for the whole run',
		async (resource, target) => {
			const sent = await runCreate(resource, target, ['jane@example.com', 'jane@example.com']);

			expect(sent).toEqual(['<at id="0">Jane Smith</at> hi', '<at id="0">Jane Smith</at> hi']);
			expect(janeLookups()).toHaveLength(1);
		},
	);

	// The cache must not outlive the run. A module-level Map keyed on the user value would pass
	// the test above while bleeding resolved users across executions and tenants, so pin the
	// scope, not just the hit.
	it.each(RESOURCES)('%s create starts a second run cold', async (resource, target) => {
		await runCreate(resource, target, ['jane@example.com', 'jane@example.com']);
		ctx = newCtx();
		await runCreate(resource, target, ['jane@example.com', 'jane@example.com']);

		expect(janeLookups()).toHaveLength(2);
	});

	// A transient failure must not be cached, or one 429 would be replayed as a hard failure for
	// every later item under continueOnFail.
	it.each(RESOURCES)(
		'%s create retries a mention that failed to resolve',
		async (resource, target) => {
			ctx.continueOnFail.mockReturnValue(true);
			let attempt = 0;
			const sent = await runCreate(
				resource,
				target,
				['jane@example.com', 'jane@example.com'],
				{ includeLinkToWorkflow: false },
				async (_method: string, resourcePath: string) => {
					if (resourcePath === '/v1.0/users/jane%40example.com' && attempt++ === 0) {
						throw new NodeApiError(
							mock<INode>(),
							{ message: 'Too many requests' },
							{ httpCode: '429' },
						);
					}
					return resourcePath in USERS ? USERS[resourcePath] : { id: 'sent' };
				},
			);

			// Item 0 failed, item 1 resolved, so the second item still posts a real mention.
			expect(sent).toEqual(['<at id="0">Jane Smith</at> hi']);
			expect(janeLookups()).toHaveLength(2);
		},
	);
});
