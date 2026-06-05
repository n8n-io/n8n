import type { TestInfo } from '@playwright/test';

import { test, expect, instanceAiTestConfig, getInstanceAiTestSlug } from './fixtures';
import type { ApiHelpers } from '../../../services/api-helper';

const TERMINAL_FALLBACK_TEXT = 'I finished the run, but I did not generate a final response';

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

type TraceEvent = {
	kind?: string;
	stepId?: number;
	agentRole?: string;
	toolName?: string;
	input?: Record<string, unknown>;
	output?: Record<string, unknown>;
	suspendPayload?: Record<string, unknown>;
};

type RemediationTraceSummary = {
	built: boolean;
	workflowId?: string;
	needsUserInput: boolean;
	mockedSlackCredential: boolean;
	postBuildRemediationSubmitsUsed?: number;
	buildCallsAfterTerminalSetup: number;
	setupRequiredByBuild: boolean;
	usedLegacyBuilderTool: boolean;
	openedWorkflowSetup: boolean;
	workflowSetupAfterBuild: boolean;
	workflowSetupAfterSetupSignal: boolean;
	completedCheckpointBeforeWorkflowSetup: boolean;
	fallbackNarrationSeen: boolean;
};

async function getTraceEvents(api: ApiHelpers, testInfo: TestInfo): Promise<TraceEvent[]> {
	return (await api.getInstanceAiToolTraceEvents(getInstanceAiTestSlug(testInfo))) as TraceEvent[];
}

function getToolCalls(events: TraceEvent[], toolName: string): TraceEvent[] {
	return events.filter((event) => event.kind === 'tool-call' && event.toolName === toolName);
}

function getToolEvents(events: TraceEvent[], toolName: string): TraceEvent[] {
	return events.filter(
		(event) =>
			(event.kind === 'tool-call' || event.kind === 'tool-suspend') && event.toolName === toolName,
	);
}

function getLatestRecordingEvents(events: TraceEvent[]): TraceEvent[] {
	const lastHeaderIndex = events.findLastIndex((event) => event.kind === 'header');

	return lastHeaderIndex >= 0 ? events.slice(lastHeaderIndex + 1) : events;
}

function getFirstIndex(...indexes: number[]): number {
	return indexes.filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? -1;
}

function getStringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function includesMockedSlackSetup(value: unknown): boolean {
	return typeof value === 'string' && value.includes('slackApi') && value.includes('mocked');
}

function hasSetupRequestCredential(event: TraceEvent, credentialType: string): boolean {
	const setupRequests = event.suspendPayload?.setupRequests;
	if (!Array.isArray(setupRequests)) return false;

	return setupRequests.some(
		(request) =>
			typeof request === 'object' &&
			request !== null &&
			Reflect.get(request, 'credentialType') === credentialType,
	);
}

function summarizeRemediationTrace(events: TraceEvent[]): RemediationTraceSummary {
	const buildCalls = getToolCalls(events, 'build-workflow');
	const firstSuccessfulBuildEventIndex = events.findIndex(
		(event) =>
			event.kind === 'tool-call' &&
			event.toolName === 'build-workflow' &&
			event.output?.success === true &&
			typeof event.output.workflowId === 'string',
	);
	const firstSuccessfulBuildIndex = buildCalls.findIndex(
		(event) => event.output?.success === true && typeof event.output.workflowId === 'string',
	);
	const firstSuccessfulBuild = buildCalls[firstSuccessfulBuildIndex]?.output;
	const setupRequirement = firstSuccessfulBuild?.setupRequirement as
		| Record<string, unknown>
		| undefined;
	const verificationReadiness = firstSuccessfulBuild?.verificationReadiness as
		| Record<string, unknown>
		| undefined;
	const setupRequiredByBuild =
		setupRequirement?.status === 'required' || verificationReadiness?.status === 'needs_setup';
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
	const buildSetupRequirementIndex = events.findIndex((event) => {
		const eventSetupRequirement = event.output?.setupRequirement as
			| Record<string, unknown>
			| undefined;
		const eventVerificationReadiness = event.output?.verificationReadiness as
			| Record<string, unknown>
			| undefined;
		return (
			event.kind === 'tool-call' &&
			event.toolName === 'build-workflow' &&
			event.output?.success === true &&
			(eventSetupRequirement?.status === 'required' ||
				eventVerificationReadiness?.status === 'needs_setup')
		);
	});
	const terminalWorkflowSetupIndex = events.findIndex((event) => {
		return (
			(event.kind === 'tool-call' || event.kind === 'tool-suspend') &&
			event.toolName === 'workflows' &&
			event.input?.action === 'setup' &&
			event.input.workflowId === firstSuccessfulBuild?.workflowId
		);
	});
	const workflowSetupRequestsSlackCredential = getToolEvents(events, 'workflows').some(
		(event) =>
			event.input?.action === 'setup' &&
			event.input.workflowId === firstSuccessfulBuild?.workflowId &&
			hasSetupRequestCredential(event, 'slackApi'),
	);
	const terminalSetupIndex = getFirstIndex(
		buildSetupRequirementIndex,
		terminalSetupVerifyIndex,
		terminalSetupReportIndex,
		terminalWorkflowSetupIndex,
	);
	const terminalSetupSignalIndex = getFirstIndex(
		buildSetupRequirementIndex,
		terminalSetupVerifyIndex,
		terminalSetupReportIndex,
	);
	const firstCompleteCheckpointIndex = events.findIndex(
		(event) =>
			(event.kind === 'tool-call' || event.kind === 'tool-suspend') &&
			event.toolName === 'complete-checkpoint',
	);
	const remediation =
		terminalSetupVerifyIndex >= 0
			? (events[terminalSetupVerifyIndex].output?.remediation as Record<string, unknown>)
			: undefined;
	const buildCallsAfterTerminalSetup =
		terminalSetupIndex >= 0
			? events
					.slice(terminalSetupIndex + 1)
					.filter((event) => event.kind === 'tool-call' && event.toolName === 'build-workflow')
					.length
			: 0;
	return {
		built: firstSuccessfulBuildIndex >= 0,
		workflowId:
			typeof firstSuccessfulBuild?.workflowId === 'string'
				? firstSuccessfulBuild.workflowId
				: undefined,
		needsUserInput:
			setupRequiredByBuild ||
			(remediation?.category === 'needs_setup' &&
				remediation.shouldEdit === false &&
				remediation.reason === 'mocked_credentials_or_placeholders') ||
			terminalSetupReportIndex >= 0 ||
			terminalWorkflowSetupIndex >= 0,
		mockedSlackCredential:
			getStringArray(firstSuccessfulBuild?.mockedCredentialTypes).includes('slackApi') ||
			workflowSetupRequestsSlackCredential,
		postBuildRemediationSubmitsUsed:
			firstSuccessfulBuildIndex >= 0
				? buildCalls.length - firstSuccessfulBuildIndex - 1
				: undefined,
		buildCallsAfterTerminalSetup,
		setupRequiredByBuild,
		usedLegacyBuilderTool: getToolEvents(events, 'build-workflow-with-agent').length > 0,
		openedWorkflowSetup: terminalWorkflowSetupIndex >= 0,
		workflowSetupAfterBuild:
			firstSuccessfulBuildEventIndex >= 0 &&
			terminalWorkflowSetupIndex > firstSuccessfulBuildEventIndex,
		workflowSetupAfterSetupSignal:
			terminalSetupSignalIndex >= 0 && terminalWorkflowSetupIndex > terminalSetupSignalIndex,
		completedCheckpointBeforeWorkflowSetup:
			firstCompleteCheckpointIndex >= 0 &&
			(terminalWorkflowSetupIndex < 0 || firstCompleteCheckpointIndex < terminalWorkflowSetupIndex),
		fallbackNarrationSeen: JSON.stringify(events).includes(TERMINAL_FALLBACK_TEXT),
	};
}

test.describe(
	'Instance AI remediation guard @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test(
			'should preserve a submitted workflow when mocked credential verification needs setup',
			{
				annotation: [
					{
						type: 'expectation-slug',
						description:
							'should-preserve-a-submitted-workflow-when-mocked-credential-verification-needs-setup',
					},
				],
			},
			async ({ api, n8nContainer, n8n }, testInfo) => {
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
						'Use the workflow-builder skill, create a build plan for approval, and save it with build-workflow. ' +
						'When the build result reports that setup is required before verification, open the workflow setup card with workflows(action="setup") and stop editing.',
				);
				await n8n.instanceAi.approveBuildPlan(180_000);

				await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible({ timeout: 540_000 });
				await expect(
					n8n.instanceAi.getAssistantMessageText('Opening skill: workflow-builder'),
				).toBeVisible();
				await expect(n8n.instanceAi.getAssistantMessageText(TERMINAL_FALLBACK_TEXT)).toHaveCount(0);

				const events = getLatestRecordingEvents(await getTraceEvents(api, testInfo));
				const summary = summarizeRemediationTrace(events);
				const buildCalls = getToolCalls(events, 'build-workflow');
				const setupCalls = getToolEvents(events, 'workflows').filter(
					(event) =>
						event.input?.action === 'setup' && event.input.workflowId === summary.workflowId,
				);

				expect(summary).toMatchObject({
					built: true,
					workflowId: expect.any(String),
					needsUserInput: true,
					mockedSlackCredential: true,
					buildCallsAfterTerminalSetup: 0,
					setupRequiredByBuild: true,
					usedLegacyBuilderTool: false,
					openedWorkflowSetup: true,
					workflowSetupAfterBuild: true,
					workflowSetupAfterSetupSignal: true,
					completedCheckpointBeforeWorkflowSetup: false,
					fallbackNarrationSeen: false,
				});
				expect(summary.postBuildRemediationSubmitsUsed).toBeLessThanOrEqual(2);
				expect(buildCalls.find((event) => event.agentRole === 'orchestrator')).toMatchObject({
					agentRole: 'orchestrator',
					stepId: expect.any(Number),
				});
				expect(setupCalls.find((event) => event.agentRole === 'orchestrator')).toMatchObject({
					agentRole: 'orchestrator',
					stepId: expect.any(Number),
					suspendPayload: expect.objectContaining({
						workflowId: summary.workflowId,
						setupRequests: expect.any(Array),
					}),
				});
			},
		);
	},
);
