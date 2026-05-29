import type { TestInfo } from '@playwright/test';

import { test, expect, instanceAiTestConfig, getInstanceAiTestSlug } from './fixtures';
import type { ApiHelpers } from '../../../services/api-helper';

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
	resumeData?: Record<string, unknown>;
};

type RemediationTraceSummary = {
	built: boolean;
	workflowId?: string;
	verifiedWithMocksBeforeSetup: boolean;
	setupOpened: boolean;
	setupCredentialType?: string;
	legacySubmitWorkflowUsed: boolean;
	legacyWorkflowBuilderRoleUsed: boolean;
	workflowMutationAgentRole?: string;
	workflowMutationCallsAfterTerminalSetup: number;
};

async function getTraceEvents(api: ApiHelpers, testInfo: TestInfo): Promise<TraceEvent[]> {
	return (await api.getInstanceAiToolTraceEvents(getInstanceAiTestSlug(testInfo))) as TraceEvent[];
}

function getToolEvents(events: TraceEvent[], toolName: string): TraceEvent[] {
	return events.filter((event) => event.toolName === toolName);
}

function getCompletedToolEvents(events: TraceEvent[], toolName: string): TraceEvent[] {
	return getToolEvents(events, toolName).filter(
		(event) => event.kind === 'tool-call' || event.kind === 'tool-resume',
	);
}

function summarizeRemediationTrace(events: TraceEvent[]): RemediationTraceSummary {
	const workflowMutationCalls = getCompletedToolEvents(events, 'workflows').filter(
		(event) => event.input?.action === 'create' || event.input?.action === 'update',
	);
	const firstSuccessfulBuild = workflowMutationCalls.find(
		(event) => event.output?.success === true && typeof event.output.workflowId === 'string',
	);
	const workflowId =
		typeof firstSuccessfulBuild?.output?.workflowId === 'string'
			? firstSuccessfulBuild.output.workflowId
			: undefined;
	const terminalSetupVerificationIndex = events.findIndex((event) =>
		isTerminalSetupVerification(event, workflowId),
	);
	const setupIndex = events.findIndex(
		(event) =>
			(event.kind === 'tool-call' || event.kind === 'tool-suspend') &&
			event.toolName === 'workflows' &&
			event.input?.action === 'setup' &&
			event.input.workflowId === workflowId,
	);

	return {
		built: Boolean(firstSuccessfulBuild),
		workflowId,
		verifiedWithMocksBeforeSetup:
			terminalSetupVerificationIndex >= 0 &&
			(setupIndex === -1 || terminalSetupVerificationIndex < setupIndex),
		setupOpened: hasDirectSetupCall(events, workflowId),
		setupCredentialType: getSetupCredentialType(events, workflowId),
		legacySubmitWorkflowUsed: getToolEvents(events, 'submit-workflow').length > 0,
		legacyWorkflowBuilderRoleUsed: events.some((event) => event.agentRole === 'workflow-builder'),
		workflowMutationAgentRole: firstSuccessfulBuild?.agentRole,
		workflowMutationCallsAfterTerminalSetup:
			terminalSetupVerificationIndex === -1
				? 0
				: workflowMutationCalls.filter((event) => {
						const index = events.indexOf(event);
						return index > terminalSetupVerificationIndex;
					}).length,
	};
}

function isTerminalSetupVerification(event: TraceEvent, workflowId: string | undefined): boolean {
	if (!workflowId) return false;
	if (event.kind !== 'tool-call' && event.kind !== 'tool-resume') return false;
	if (event.toolName !== 'verify-built-workflow') return false;
	if (event.input?.workflowId !== workflowId) return false;

	const remediation = event.output?.remediation;
	if (!remediation || typeof remediation !== 'object') return false;
	const record = remediation as Record<string, unknown>;
	return (
		record.category === 'needs_setup' && record.reason === 'mocked_credentials_or_placeholders'
	);
}

function getSetupCredentialType(
	events: TraceEvent[],
	workflowId: string | undefined,
): string | undefined {
	if (!workflowId) return undefined;
	const setupEvent = events.find(
		(event) =>
			event.kind === 'tool-suspend' &&
			event.toolName === 'workflows' &&
			event.input?.action === 'setup' &&
			event.input.workflowId === workflowId,
	);
	const setupRequests = setupEvent?.suspendPayload?.setupRequests;
	if (!Array.isArray(setupRequests)) return undefined;
	const first = setupRequests[0];
	if (!first || typeof first !== 'object') return undefined;
	const credentialType = (first as Record<string, unknown>).credentialType;
	return typeof credentialType === 'string' ? credentialType : undefined;
}

function hasDirectSetupCall(events: TraceEvent[], workflowId: string | undefined): boolean {
	if (!workflowId) return false;

	return events.some(
		(event) =>
			(event.kind === 'tool-call' || event.kind === 'tool-suspend') &&
			event.toolName === 'workflows' &&
			event.input?.action === 'setup' &&
			event.input.workflowId === workflowId,
	);
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
						'Use the workflow SDK credential placeholder directly; do not ask for a real Slack credential. ' +
						'After the workflow is saved, verify or test it with mock data before opening setup. ' +
						'If verification reports mocked credential setup is needed, open the workflow setup card and stop editing.',
				);

				await n8n.instanceAi.approveBuildPlan();
				await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible({ timeout: 540_000 });

				const events = await getTraceEvents(api, testInfo);
				const summary = summarizeRemediationTrace(events);
				const workflowMutationCalls = getCompletedToolEvents(events, 'workflows').filter(
					(event) => event.input?.action === 'create' || event.input?.action === 'update',
				);

				expect(summary).toMatchObject({
					built: true,
					workflowId: expect.any(String),
					verifiedWithMocksBeforeSetup: true,
					setupOpened: true,
					setupCredentialType: 'slackApi',
					legacySubmitWorkflowUsed: false,
					legacyWorkflowBuilderRoleUsed: false,
					workflowMutationAgentRole: 'orchestrator',
					workflowMutationCallsAfterTerminalSetup: 0,
				});
				expect(
					workflowMutationCalls.find((event) => event.agentRole === 'orchestrator'),
				).toMatchObject({
					agentRole: 'orchestrator',
					stepId: expect.any(Number),
				});
				expect(hasDirectSetupCall(events, summary.workflowId)).toBe(true);
			},
		);
	},
);
