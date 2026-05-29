import { readFileSync } from 'fs';
import { join } from 'path';

import { test, expect } from '../../../fixtures/eval-base';

type Scenario = {
	name: string;
	description: string;
	dataSetup: string;
	successCriteria: string;
};

type EvalFixture = {
	prompt?: string;
	conversation?: Array<{ text: string }>;
	complexity: string;
	tags: string[];
	triggerType: string;
	scenarios?: Scenario[];
	executionScenarios?: Scenario[];
};

type StubWorkflowNode = { type: string; name: string };
type StubWorkflow = { nodes: StubWorkflowNode[] };
type StubBuildResult = { workflow: StubWorkflow; tokensUsed: number; durationMs: number };

const FIXTURE_PATH = join(
	__dirname,
	'../../../../../@n8n/instance-ai/evaluations/data/workflows/weather-alert.json',
);

function loadFixture(): EvalFixture {
	return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as EvalFixture;
}

function stubBuildWorkflow(_prompt: string): Promise<StubBuildResult> {
	return Promise.resolve({
		workflow: {
			nodes: [
				{ type: 'n8n-nodes-base.scheduleTrigger', name: 'Every day at 8am' },
				{ type: 'n8n-nodes-base.httpRequest', name: 'OpenMeteo' },
				{ type: 'n8n-nodes-base.if', name: 'Will it rain?' },
				{ type: 'n8n-nodes-base.gmail', name: 'Send rain alert' },
			],
		},
		tokensUsed: 1234,
		durationMs: 42,
	});
}

const fixture = loadFixture();
const prompt = fixture.prompt ?? fixture.conversation?.map(({ text }) => text).join('\n') ?? '';
const scenarios = fixture.scenarios ?? fixture.executionScenarios ?? [];

test.describe('eval: weather-alert', () => {
	for (const scenario of scenarios) {
		// eslint-disable-next-line playwright/valid-title
		test(scenario.name, async ({ traced }) => {
			const result = await traced(`weather-alert/${scenario.name}`, () =>
				stubBuildWorkflow(prompt),
			);

			expect(result.workflow.nodes.map((n) => n.type)).toContain('n8n-nodes-base.scheduleTrigger');
			expect(result.workflow.nodes.map((n) => n.type)).toContain('n8n-nodes-base.gmail');
			expect(result.workflow.nodes.map((n) => n.type)).toContain('n8n-nodes-base.if');
			expect(result.tokensUsed).toBeGreaterThan(0);
		});
	}
});
