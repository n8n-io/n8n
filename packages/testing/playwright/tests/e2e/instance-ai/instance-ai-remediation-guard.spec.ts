import type { TestInfo } from '@playwright/test';

import { test, expect, instanceAiTestConfig } from './fixtures';
import type { ApiHelpers } from '../../../services/api-helper';

test.use({
	...instanceAiTestConfig,
	capability: {
		...instanceAiTestConfig.capability,
		env: {
			...instanceAiTestConfig.capability.env,
			N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN: 'false',
			N8N_INSTANCE_AI_SANDBOX_ENABLED: 'true',
			N8N_INSTANCE_AI_SANDBOX_PROVIDER: 'local',
			N8N_INSTANCE_AI_SANDBOX_TIMEOUT: '600000',
		},
	},
});

type TraceEvent = {
	kind?: string;
	stepId?: number;
	agentRole?: string;
	toolName?: string;
	input?: Record<string, unknown>;
	output?: Record<string, unknown>;
};

type RemediationTraceSummary = {
	submitted: boolean;
	workflowId?: string;
	needsUserInput: boolean;
	mockedSlackCredential: boolean;
	postSubmitRemediationSubmitsUsed?: number;
	submitCallsAfterTerminalSetup: number;
};

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

async function getTraceEvents(api: ApiHelpers, testInfo: TestInfo): Promise<TraceEvent[]> {
	return (await api.getInstanceAiToolTraceEvents(slugify(testInfo.title))) as TraceEvent[];
}

function getToolCalls(events: TraceEvent[], toolName: string): TraceEvent[] {
	return events.filter((event) => event.kind === 'tool-call' && event.toolName === toolName);
}

function getStringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function includesMockedSlackSetup(value: unknown): boolean {
	return typeof value === 'string' && value.includes('slackApi') && value.includes('mocked');
}

function summarizeRemediationTrace(events: TraceEvent[]): RemediationTraceSummary {
	const submitCalls = getToolCalls(events, 'submit-workflow');
	const firstSuccessfulSubmitIndex = submitCalls.findIndex(
		(event) => event.output?.success === true && typeof event.output.workflowId === 'string',
	);
	const firstSuccessfulSubmit = submitCalls[firstSuccessfulSubmitIndex]?.output;
	const terminalSetupVerifyIndex = events.findIndex((event) => {
		const remediation = event.output?.remediation as Record<string, unknown> | undefined;
		return (
			event.kind === 'tool-call' &&
			event.toolName === 'verify-built-workflow' &&
			event.output?.success === false &&
			remediation?.category === 'needs_setup' &&
			remediation.shouldEdit === false &&
			remediation.reason === 'mocked_credentials_or_placeholders'
		);
	});
	const terminalSetupReportIndex = events.findIndex((event) => {
		return (
			event.kind === 'tool-call' &&
			event.toolName === 'report-verification-verdict' &&
			event.input?.verdict === 'needs_user_input' &&
			(includesMockedSlackSetup(event.input.diagnosis) ||
				includesMockedSlackSetup(event.input.summary) ||
				includesMockedSlackSetup(event.output?.guidance))
		);
	});
	const terminalWorkflowSetupIndex = events.findIndex((event) => {
		return (
			event.kind === 'tool-call' &&
			event.toolName === 'workflows' &&
			event.input?.action === 'setup' &&
			event.input.workflowId === firstSuccessfulSubmit?.workflowId
		);
	});
	const terminalSetupIndex =
		terminalSetupVerifyIndex >= 0
			? terminalSetupVerifyIndex
			: terminalSetupReportIndex >= 0
				? terminalSetupReportIndex
				: terminalWorkflowSetupIndex;
	const remediation =
		terminalSetupVerifyIndex >= 0
			? (events[terminalSetupVerifyIndex].output?.remediation as Record<string, unknown>)
			: undefined;
	const submitCallsAfterTerminalSetup =
		terminalSetupIndex >= 0
			? events
					.slice(terminalSetupIndex + 1)
					.filter((event) => event.kind === 'tool-call' && event.toolName === 'submit-workflow')
					.length
			: 0;

	return {
		submitted: firstSuccessfulSubmitIndex >= 0,
		workflowId:
			typeof firstSuccessfulSubmit?.workflowId === 'string'
				? firstSuccessfulSubmit.workflowId
				: undefined,
		needsUserInput:
			(remediation?.category === 'needs_setup' &&
				remediation.shouldEdit === false &&
				remediation.reason === 'mocked_credentials_or_placeholders') ||
			terminalSetupReportIndex >= 0 ||
			terminalWorkflowSetupIndex >= 0,
		mockedSlackCredential: getStringArray(firstSuccessfulSubmit?.mockedCredentialTypes).includes(
			'slackApi',
		),
		postSubmitRemediationSubmitsUsed:
			firstSuccessfulSubmitIndex >= 0
				? submitCalls.length - firstSuccessfulSubmitIndex - 1
				: undefined,
		submitCallsAfterTerminalSetup,
	};
}

test.describe(
	'Instance AI remediation guard @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test('should preserve a submitted workflow when mocked credential verification needs setup', async ({
			api,
			n8nContainer,
			n8n,
		}, testInfo) => {
			test.setTimeout(600_000);
			test.skip(!n8nContainer, 'Replay trace assertions require the container proxy harness');
			test.skip(
				testInfo.project.name.includes('multi-main'),
				'Trace replay state is process-local and not stable in multi-main mode',
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(
				'Build a workflow named "INS-164 mocked credential guard" with a Manual Trigger ' +
					'connected to a Slack node that posts a message using a mocked slackApi credential placeholder. ' +
					'Use the workflow SDK credential placeholder directly; do not call credentials setup or ask for a real Slack credential. ' +
					'The builder agent must submit it and verify it with verify-built-workflow. ' +
					'After verification reports the mocked credential setup state, open the workflow setup card with workflows(action="setup") and stop editing.',
			);

			await expect(n8n.instanceAi.getWorkflowSetupCard()).toBeVisible({ timeout: 540_000 });

			const events = await getTraceEvents(api, testInfo);
			const summary = summarizeRemediationTrace(events);
			const submitCalls = getToolCalls(events, 'submit-workflow');
			const verifyCalls = getToolCalls(events, 'verify-built-workflow');

			expect(summary).toMatchObject({
				submitted: true,
				workflowId: expect.any(String),
				needsUserInput: true,
				mockedSlackCredential: true,
				submitCallsAfterTerminalSetup: 0,
			});
			expect(summary.postSubmitRemediationSubmitsUsed).toBeLessThanOrEqual(2);
			expect(submitCalls.find((event) => event.agentRole === 'workflow-builder')).toMatchObject({
				agentRole: 'workflow-builder',
				stepId: expect.any(Number),
			});
			expect(verifyCalls.find((event) => event.agentRole === 'workflow-builder')).toMatchObject({
				agentRole: 'workflow-builder',
				stepId: expect.any(Number),
			});
		});
	},
);
