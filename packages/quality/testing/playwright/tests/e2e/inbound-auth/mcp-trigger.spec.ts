import {
	SOURCE_KINDS,
	expect,
	expectExecuteGate,
	expectTriggerRefusals,
	publishMcpTrigger,
	test,
	withTrigger,
} from './fixtures';

test.use({ capability: 'trusted-sources' });

test.describe(
	'Inbound auth: MCP Trigger @licensed',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		for (const kind of SOURCE_KINDS) {
			test.describe(`with the ${kind} source`, () => {
				test('should run as the member only while the member can execute the workflow', async ({
					api,
					memberApi,
					caller,
					sources,
				}) => {
					await withTrigger(api, publishMcpTrigger(api, sources[kind].id), async (trigger) => {
						await expectExecuteGate(api, memberApi, sources[kind], trigger, {
							run: async (headers) => {
								const session = await caller.mcp.streamableHttpInitialize(trigger.path, {
									headers,
								});
								const result = await caller.mcp.callTool(
									session,
									trigger.path,
									'echo',
									{ message: 'hi' },
									{ headers },
								);
								expect(result.isError).toBeFalsy();
								expect(result.content.map(({ text }) => text).join('\n')).toContain('Echo: hi');
							},
							send: async (headers) =>
								await caller.mcp.streamableHttpInitializeRaw(trigger.path, { headers }),
						});
					});
				});

				test('should challenge, refuse the other source and list only this source', async ({
					api,
					caller,
					sources,
				}) => {
					await withTrigger(api, publishMcpTrigger(api, sources[kind].id), async (trigger) => {
						await expectTriggerRefusals(
							api,
							trigger,
							sources,
							kind,
							async (token) =>
								await caller.mcp.streamableHttpInitializeRaw(trigger.path, {
									headers: token ? { Authorization: `Bearer ${token}` } : {},
								}),
						);
					});
				});
			});
		}
	},
);
