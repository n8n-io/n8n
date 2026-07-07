import type { TestInfo } from '@playwright/test';

import { test, expect, instanceAiTestConfig, getInstanceAiTestSlug } from './fixtures';
import type { ApiHelpers } from '../../../services/api-helper';

// Regression gate for the agent-builder port: with the agents module ACTIVE,
// a normal workflow-building prompt must still route through the
// workflow-builder skill and must never load the agent-builder skill or invoke
// the agent_builder router tool. Assertions are made on the tool trace (the
// deterministic source of truth), read after the build produces a concrete UI
// artifact — mirroring the remediation-guard spec pattern.
test.use({
	...instanceAiTestConfig,
	capability: {
		...instanceAiTestConfig.capability,
		env: {
			...instanceAiTestConfig.capability.env,
			N8N_ENABLED_MODULES: 'instance-ai,agents',
			TEST_ISOLATION: 'instance-ai-agents-module',
		},
	},
});

type TraceEvent = {
	kind?: string;
	toolName?: string;
	input?: Record<string, unknown>;
	output?: Record<string, unknown>;
};

async function getTraceEvents(api: ApiHelpers, testInfo: TestInfo): Promise<TraceEvent[]> {
	return (await api.getInstanceAiToolTraceEvents(getInstanceAiTestSlug(testInfo))) as TraceEvent[];
}

function getLatestRecordingEvents(events: TraceEvent[]): TraceEvent[] {
	const lastHeaderIndex = events.findLastIndex((event) => event.kind === 'header');

	return lastHeaderIndex >= 0 ? events.slice(lastHeaderIndex + 1) : events;
}

function getSkillLoads(events: TraceEvent[]): string[] {
	return events
		.filter((event) => event.kind === 'tool-call' && event.toolName === 'load_skill')
		.map((event) => (typeof event.input?.skillId === 'string' ? event.input.skillId : ''))
		.filter((skillId) => skillId.length > 0);
}

test.describe(
	'Instance AI agents-module smoke @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test(
			'should not select agent-builder for a plain workflow-building prompt',
			{
				annotation: [
					{
						type: 'expectation-slug',
						description: 'should-not-select-agent-builder-for-a-plain-workflow-building-prompt',
					},
				],
			},
			async ({ api, n8nContainer, n8n }, testInfo) => {
				test.setTimeout(600_000);
				test.skip(!n8nContainer, 'Replay trace assertions require the container proxy harness');

				await n8n.navigate.toInstanceAi();
				// Trivial workflow prompt so the build completes fast enough to
				// record proxy expectations; the routing decision is the same
				// as for any plain workflow-building request.
				await n8n.instanceAi.sendMessage(
					'Build a workflow with a Manual Trigger connected to an Edit Fields (Set) node that ' +
						'adds a static field. Save it.',
				);

				// Wait for the build to produce a concrete UI artifact (the
				// preview panel mounts once a workflow is built), then read the
				// trace — by this point the routing decisions are populated.
				await expect(n8n.instanceAi.getPreviewPanel()).toBeVisible({ timeout: 540_000 });

				const events = getLatestRecordingEvents(await getTraceEvents(api, testInfo));
				const skillLoads = getSkillLoads(events);

				expect(skillLoads).toContain('workflow-builder');
				expect(skillLoads).not.toContain('agent-builder');

				const agentBuilderCalls = events.filter(
					(event) =>
						(event.kind === 'tool-call' || event.kind === 'tool-suspend') &&
						event.toolName === 'agent_builder',
				);
				expect(agentBuilderCalls).toHaveLength(0);
			},
		);
	},
);
