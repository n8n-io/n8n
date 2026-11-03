import { nanoid } from 'nanoid';

import {
	SOURCE_KINDS,
	expect,
	expectNoCredentialChallenge,
	test,
	waitForResourceMetadata,
} from './fixtures';

test.use({ capability: 'trusted-sources' });

test.describe(
	'Inbound auth: instance MCP @licensed',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should challenge a request with no credential', async ({ caller }) => {
			const { resource } = await waitForResourceMetadata(caller, 'mcp-server/http');

			const response = await caller.mcp.internalMcpInitialize();

			expectNoCredentialChallenge(response, resource);
		});

		for (const kind of SOURCE_KINDS) {
			test(`should initialize and list tools with a token from ${kind}`, async ({
				api,
				memberApi,
				caller,
				sources,
			}) => {
				const source = sources[kind];
				const runId = nanoid();
				const ownerWorkflow = await api.workflows.createWorkflow({
					name: `Owner ${runId}`,
					nodes: [],
					connections: {},
				});
				const memberWorkflow = await memberApi.workflows.createWorkflow({
					name: `Member ${runId}`,
					nodes: [],
					connections: {},
				});

				const metadata = await waitForResourceMetadata(caller, 'mcp-server/http');
				// Instance MCP lists every source that serves it.
				expect(metadata.authorization_servers).toContain(source.issuer);
				const token = await source.bearerFor(metadata.resource);

				const initialized = await caller.mcp.internalMcpInitialize(token);
				expect(initialized.status()).toBe(200);
				const { result } = await caller.mcp.parseResponseEnvelope(initialized);
				expect(result).toMatchObject({ serverInfo: { name: 'n8n MCP Server' } });

				const tools = await caller.mcp.internalMcpListTools(token);
				expect(tools.map(({ name }) => name)).toContain('search_workflows');

				// The token resolved to the member: their workflow is found, the owner's private one is not.
				const found = await caller.mcp.internalMcpSearchWorkflows(token, { query: runId });
				const ids = found.data.map(({ id }) => id);
				expect(ids).toContain(memberWorkflow.id);
				expect(ids).not.toContain(ownerWorkflow.id);
				await source.expectBinding();
			});
		}
	},
);
