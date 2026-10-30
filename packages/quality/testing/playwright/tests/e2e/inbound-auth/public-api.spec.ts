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
	'Inbound auth: public API @licensed',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should challenge a request with no credential', async ({ caller }) => {
			const { resource } = await waitForResourceMetadata(caller, 'api/v1');

			const response = await caller.publicApi.listWorkflowsWithBearerRaw();

			expectNoCredentialChallenge(response, resource);
		});

		for (const kind of SOURCE_KINDS) {
			test(`should list the member's workflows with a token from ${kind}`, async ({
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

				const metadata = await waitForResourceMetadata(caller, 'api/v1');
				// The public API lists every source that serves it.
				expect(metadata.authorization_servers).toContain(source.issuer);

				const response = await caller.publicApi.listWorkflowsWithBearerRaw(
					await source.bearerFor(metadata.resource),
				);

				expect(response.status()).toBe(200);
				// The token resolved to the member: their workflow is listed, the owner's private one is not.
				const { data } = (await response.json()) as { data: Array<{ id: string }> };
				const ids = data.map(({ id }) => id);
				expect(ids).toContain(memberWorkflow.id);
				expect(ids).not.toContain(ownerWorkflow.id);
				await source.expectBinding();
			});
		}
	},
);
