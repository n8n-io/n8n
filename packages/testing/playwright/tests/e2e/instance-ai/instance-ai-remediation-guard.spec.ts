import type { TestInfo } from '@playwright/test';

import { test, expect, instanceAiTestConfig } from './fixtures';

test.use({
	...instanceAiTestConfig,
	capability: {
		...instanceAiTestConfig.capability,
		env: {
			...instanceAiTestConfig.capability.env,
			N8N_INSTANCE_AI_SANDBOX_ENABLED: 'true',
			N8N_INSTANCE_AI_SANDBOX_PROVIDER: 'local',
			N8N_INSTANCE_AI_SANDBOX_TIMEOUT: '600000',
		},
	},
});

// The remediation loop is only exercised by the sandbox-backed builder, which exposes
// submit-workflow and verify-built-workflow. The default Instance AI E2E container
// uses the legacy build-workflow fallback, so this replay is opt-in until a sandbox
// service is available in the regular CI project.
test.skip(
	process.env.N8N_INSTANCE_AI_RECORD_REMEDIATION_REPLAY !== 'true',
	'Sandbox-backed remediation replay recording is opt-in until the CI container provides a builder sandbox',
);

type TraceEvent = {
	kind?: string;
	toolName?: string;
	output?: Record<string, unknown>;
};

type RemediationTraceSummary = {
	submitted: boolean;
	workflowId?: string;
	needsUserInput: boolean;
	mockedSlackCredential: boolean;
	postSubmitRemediationSubmitsUsed?: number;
};

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

async function getTraceEvents(backendUrl: string, testInfo: TestInfo): Promise<TraceEvent[]> {
	const response = await fetch(
		`${backendUrl}/rest/instance-ai/test/tool-trace/${slugify(testInfo.title)}`,
	);
	expect(response.ok).toBe(true);

	const body = (await response.json()) as { data?: { events?: TraceEvent[] } };
	return body.data?.events ?? [];
}

function getToolCalls(events: TraceEvent[], toolName: string): TraceEvent[] {
	return events.filter((event) => event.kind === 'tool-call' && event.toolName === toolName);
}

function getStringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function summarizeRemediationTrace(events: TraceEvent[]): RemediationTraceSummary {
	const submitCalls = getToolCalls(events, 'submit-workflow');
	const verifyCalls = getToolCalls(events, 'verify-built-workflow');
	const firstSuccessfulSubmitIndex = submitCalls.findIndex(
		(event) => event.output?.success === true && typeof event.output.workflowId === 'string',
	);
	const firstSuccessfulSubmit = submitCalls[firstSuccessfulSubmitIndex]?.output;
	const remediation = verifyCalls.find(
		(event) =>
			event.output?.success === false &&
			typeof event.output.remediation === 'object' &&
			event.output.remediation !== null,
	)?.output?.remediation as Record<string, unknown> | undefined;

	return {
		submitted: firstSuccessfulSubmitIndex >= 0,
		workflowId:
			typeof firstSuccessfulSubmit?.workflowId === 'string'
				? firstSuccessfulSubmit.workflowId
				: undefined,
		needsUserInput:
			remediation?.category === 'needs_setup' &&
			remediation.shouldEdit === false &&
			remediation.reason === 'mocked_credentials_or_placeholders',
		mockedSlackCredential: getStringArray(firstSuccessfulSubmit?.mockedCredentialTypes).includes(
			'slackApi',
		),
		postSubmitRemediationSubmitsUsed:
			firstSuccessfulSubmitIndex >= 0
				? submitCalls.length - firstSuccessfulSubmitIndex - 1
				: undefined,
	};
}

test.describe(
	'Instance AI remediation guard @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test('should preserve a submitted workflow when mocked credential verification needs setup', async ({
			backendUrl,
			n8nContainer,
			n8n,
		}, testInfo) => {
			test.skip(!n8nContainer, 'Replay trace assertions require the container proxy harness');
			test.setTimeout(600_000);

			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage(
				'Build a workflow named "INS-164 mocked credential guard". ' +
					'Use Manual Trigger, then a Slack node that sends a message using a new slackApi credential placeholder, ' +
					'then a Code node named "Guard Assertion" that throws if the incoming item contains _mockedCredential. ' +
					'Submit it, verify it with verify-built-workflow, and if verification says setup or credentials are needed, stop editing.',
			);

			await expect
				.poll(
					async () => {
						const events = await getTraceEvents(backendUrl, testInfo);
						const summary = summarizeRemediationTrace(events);

						return summary.submitted && summary.needsUserInput && summary.mockedSlackCredential;
					},
					{ timeout: 540_000 },
				)
				.toBe(true);

			const events = await getTraceEvents(backendUrl, testInfo);
			const summary = summarizeRemediationTrace(events);

			expect(summary).toMatchObject({
				submitted: true,
				workflowId: expect.any(String),
				needsUserInput: true,
				mockedSlackCredential: true,
			});
			expect(summary.postSubmitRemediationSubmitsUsed).toBeLessThanOrEqual(2);
		});
	},
);
