import type { ScriptInput } from '../../../services/scripted-llm/scripted-llm.types';
import { expect, requireLinkedInstances, test } from './fixtures';

const SCRIPTED_REPLY = 'Hello from the scripted model.';

// Only the agent turn matches. Title and memory calls get the fallback text. The
// regex has no anchors: n8n can add context blocks around the user text.
const SMOKE_SCRIPT = {
	rules: [
		{
			id: 'say-hello',
			when: { systemIncludes: 'n8n Instance Agent', userText: 'say hello' },
			reply: { text: SCRIPTED_REPLY },
		},
	],
	fallback: { text: 'Scripted fallback.' },
} satisfies ScriptInput;

requireLinkedInstances();
test.use({ script: SMOKE_SCRIPT });

test.describe(
	'Linked instances smoke',
	{ annotation: [{ type: 'owner', description: 'instanceAI' }] },
	() => {
		test.describe.configure({ mode: 'serial' });

		test('the Assistant on this computer answers from the scripted model', async ({ n8n, llm }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage('Say hello');

			// The chat has no message test ids in this build, so find the reply by its text.
			await expect(n8n.instanceAi.getPanelText(SCRIPTED_REPLY)).toBeVisible({ timeout: 60_000 });
			expect(llm.requests()).toContainEqual(
				expect.objectContaining({
					ruleId: 'say-hello',
					lastUserText: expect.stringContaining('Say hello'),
				}),
			);
		});

		test('the cloud instance turns on MCP access and mints an access token', async ({
			cloudApi,
			cloudUrl,
		}) => {
			await cloudApi.setMcpAccess(true);

			const { apiKey } = await cloudApi.rotateMcpApiKey();

			expect(apiKey).toMatch(/\S{20,}/);
			const probe = await cloudApi.mcp.internalMcpDiscoverAuth();
			expect(probe.url()).toBe(`${cloudUrl}/mcp-server/http`);
			expect(probe.status()).toBe(401);
			expect(probe.headers()['www-authenticate']).toContain('Bearer');
			const tools = await cloudApi.mcp.internalMcpListTools(apiKey);
			expect(tools.length).toBeGreaterThan(0);
		});
	},
);
