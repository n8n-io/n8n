import type { SelfHealingResultOutcome } from '@n8n/api-types';
import { nanoid } from 'nanoid';

import { EDIT_FIELDS_SET_NODE_NAME } from '../../../config/constants';
import { expect, test } from '../../../fixtures/base';

// Review policy affects every workflow. Use a separate instance for this journey.
test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'workflow-reviews',
			N8N_INSTANCE_AI_SELF_HEALING_ENABLED: 'true',
		},
	},
});

function scheduleTriggerNode() {
	return {
		id: nanoid(),
		name: 'Schedule Trigger',
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1.2,
		position: [0, 0] as [number, number],
		parameters: { rule: { interval: [{ field: 'days' }] } },
	};
}

const assistantCases: Array<{
	outcome: SelfHealingResultOutcome;
	withChanges: boolean;
	title: string;
	label: string;
}> = [
	{ outcome: 'fix_ready', withChanges: true, title: 'Fix ready', label: 'Fix ready' },
	{
		outcome: 'needs_you',
		withChanges: true,
		title: 'Check the proposed changes',
		label: 'Needs attention',
	},
	{
		outcome: 'needs_you',
		withChanges: false,
		title: 'Reconnect the account',
		label: 'Needs attention',
	},
	{
		outcome: 'could_not_fix',
		withChanges: false,
		title: 'Could not fix the workflow',
		label: 'Could not fix',
	},
];

test.describe(
	'Workflow reviews @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		test('author and reviewer complete a review round trip with Assistant results', async ({
			n8n,
			api,
		}) => {
			await api.enableFeature('workflowReviews');
			await api.enableFeature('personalSpacePolicy');
			await api.enableFeature('workflowDiffs');
			await api.enableFeature('namedVersions');
			expect(await api.getActiveModules(), 'Reviews need a license at startup').toContain(
				'workflow-reviews',
			);

			const author = await api.publicApi.createUser({
				email: `author-${nanoid().toLowerCase()}@test.com`,
				firstName: 'Alex',
				lastName: 'Author',
			});
			const reviewer = await api.publicApi.createUser({
				email: `reviewer-${nanoid().toLowerCase()}@test.com`,
				firstName: 'Robin',
				lastName: 'Reviewer',
			});
			const project = await api.projects.createProject(`Inbox ${nanoid(8)}`);
			await api.projects.addUserToProject(project.id, author.id, 'project:admin');
			await api.projects.addUserToProject(project.id, reviewer.id, 'project:editor');
			const authorApi = await api.createApiForUser(author);
			const reviewerApi = await api.createApiForUser(reviewer);

			// Publish fixture baselines before review approval becomes mandatory.
			await api.securitySettings.setWorkflowReviewsEnabled(false);
			const assistantResults: Array<
				(typeof assistantCases)[number] & {
					summary: string;
					resultId: string;
					workflowId: string;
					workflowName: string;
				}
			> = [];
			for (const example of assistantCases) {
				const workflowName = `Assistant workflow ${nanoid(6)}`;
				const workflow = await authorApi.workflows.createWorkflow(
					{
						name: workflowName,
						nodes: [
							scheduleTriggerNode(),
							{
								id: nanoid(),
								name: 'Failed request',
								type: 'n8n-nodes-base.stopAndError',
								typeVersion: 1,
								position: [260, 0],
								parameters: { errorMessage: 'Test investigation input' },
							},
						],
						connections: {
							'Schedule Trigger': { main: [[{ node: 'Failed request', type: 'main', index: 0 }]] },
						},
						settings: {},
					},
					project.id,
				);
				await authorApi.workflows.activate(workflow.id, workflow.versionId);
				await expect
					.poll(async () => (await authorApi.workflows.getPublicationStatus(workflow.id)).status)
					.toBe('published');
				const { executionId } = await authorApi.workflows.runManually(
					workflow.id,
					'Schedule Trigger',
				);
				const summary = `${example.title} ${nanoid(6)}`;
				const { resultId } = await api.instanceAi.createSelfHealingResult({
					workflowId: workflow.id,
					projectId: project.id,
					backgroundUserId: author.id,
					executionId,
					outcome: example.outcome,
					withChanges: example.withChanges,
					summary,
					report: 'Fixed investigation output for the Inbox test.',
					usage: {
						credits: null,
						turns: 2,
						durationSeconds: 30,
						promptTokens: 1000,
						completionTokens: 200,
						totalTokens: 1200,
					},
				});
				assistantResults.push({
					...example,
					summary,
					resultId,
					workflowId: workflow.id,
					workflowName,
				});
			}

			const workflowName = `Daily summary ${nanoid(6)}`;
			const workflow = await authorApi.workflows.createWorkflow(
				{ name: workflowName, nodes: [scheduleTriggerNode()], connections: {}, settings: {} },
				project.id,
			);
			await authorApi.workflows.activate(workflow.id, workflow.versionId);
			await expect
				.poll(async () => (await authorApi.workflows.getPublicationStatus(workflow.id)).status)
				.toBe('published');
			const baselineVersionId = workflow.versionId;
			await authorApi.workflows.update(workflow.id, workflow.versionId, {
				nodes: workflow.nodes.map((node: ReturnType<typeof scheduleTriggerNode>) => ({
					...node,
					notes: 'Check the daily summary.',
				})),
			});
			await api.securitySettings.setWorkflowReviewsEnabled(true);

			const reviewTitle = `Check daily summary ${nanoid(6)}`;
			const authorN8n = await n8n.start.withUser(author);
			const reviewerN8n = await n8n.start.withUser(reviewer);

			try {
				await test.step('Author: submit the draft for review', async () => {
					await authorN8n.start.fromExistingWorkflow(workflow.id);
					await authorN8n.canvas.getOpenPublishModalButton().click();
					await expect(authorN8n.workflowReviewControls.getPublishChoiceDialog()).toBeVisible();
					await authorN8n.workflowReviewControls.chooseSubmitForReview();
					await authorN8n.workflowReviewControls.submitForReview({
						versionName: 'Release candidate',
						title: reviewTitle,
						reviewerEmail: reviewer.email,
					});
					await expect(authorN8n.workflowReviewControls.getStatusPill()).toHaveText(
						'Waiting for review',
					);
					await authorN8n.workflowReviews.goto();
					await expect(authorN8n.workflowReviews.getGroup('Authored by you')).toContainText(
						reviewTitle,
					);
				});

				await test.step('Reviewer: open the review and compare the workflow', async () => {
					await reviewerN8n.workflowReviews.goto();
					await expect(
						reviewerN8n.workflowReviews.getGroup('Waiting for your review'),
					).toContainText(reviewTitle);
					await reviewerN8n.workflowReviews.openRequest(reviewTitle);
					await expect(reviewerN8n.workflowReviews.getSelectedRequestTitle()).toHaveText(
						reviewTitle,
					);
					await expect(reviewerN8n.page).toHaveURL(/\/inbox\/reviews\//);
					await reviewerN8n.workflowReviews.selectDetailTab('Changes');
					await expect(reviewerN8n.workflowReviews.getChangesDiff()).toContainText(
						'Schedule Trigger',
					);
					await reviewerN8n.workflowReviews.selectDetailTab('Activity');
				});
				const reviewId = new URL(reviewerN8n.page.url()).pathname.split('/').pop()!;

				await test.step('Reviewer: comment and request changes', async () => {
					await reviewerN8n.workflowReviews.postComment(
						'Please add a step to prepare the summary.',
					);
					await expect(
						reviewerN8n.workflowReviews
							.getActivityEntries()
							.filter({ hasText: 'Please add a step' }),
					).toBeVisible();
					await reviewerN8n.workflowReviews.requestChanges(
						'Add the preparation step before publishing.',
					);
					expect((await reviewerApi.workflows.getReviewRequest(reviewId)).decision).toBe(
						'changes_requested',
					);
					expect((await authorApi.workflows.getWorkflow(workflow.id)).activeVersionId).toBe(
						baselineVersionId,
					);
				});

				await test.step('Author: update the workflow and resubmit', async () => {
					await authorN8n.start.fromExistingWorkflow(workflow.id);
					await expect(authorN8n.workflowReviewControls.getStatusPill()).toHaveText(
						'Changes requested',
					);
					await authorN8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
					await authorN8n.canvas.waitForSaveWorkflowCompleted();
					await expect(authorN8n.workflowReviewControls.getStatusPill()).toHaveText(
						'Update review',
					);
					await authorN8n.workflowReviewControls.submitChangesToReview('Release candidate 2');
				});
				const resubmitted = await reviewerApi.workflows.getReviewRequest(reviewId);
				expect(resubmitted.decision).toBe('pending');
				expect((await authorApi.workflows.getWorkflow(workflow.id)).activeVersionId).toBe(
					baselineVersionId,
				);

				await test.step('Reviewer: approve and publish the new version', async () => {
					await reviewerN8n.workflowReviews.approve('Looks good now.');
					await expect(reviewerN8n.workflowReviews.getSelectedRequestStatus()).toHaveAttribute(
						'aria-label',
						'Closed | Approved',
					);
					await expect(reviewerN8n.workflowReviews.getClosedCallout()).toBeVisible();
					await reviewerN8n.page.reload();
					await expect(reviewerN8n.workflowReviews.getClosedCallout()).toBeVisible();
					await reviewerN8n.workflowReviews.selectInboxTab('Closed');
					await expect(reviewerN8n.workflowReviews.getGroup('Closed')).toContainText(reviewTitle);
					expect((await reviewerApi.workflows.getReviewRequest(reviewId)).decision).toBe(
						'approved',
					);
					expect((await authorApi.workflows.getWorkflow(workflow.id)).activeVersionId).toBe(
						resubmitted.workflows[0].workflowVersionId,
					);
				});

				await test.step('Author: confirm that the workflow is published', async () => {
					await authorN8n.page.reload();
					await authorN8n.canvas.waitForCanvasReady();
					await expect(authorN8n.canvas.getPublishedIndicator()).toBeVisible();
				});

				await test.step('Reviewer: open all four Assistant outcomes', async () => {
					await reviewerN8n.workflowReviews.selectInboxTab('Open');
					for (const result of assistantResults) {
						await expect(
							reviewerN8n.workflowReviews.getGroup('Waiting for your review'),
						).toContainText(result.summary);
						await expect(reviewerN8n.workflowReviews.getRequestRow(result.summary)).toContainText(
							result.workflowName,
						);
						await expect(
							reviewerN8n.workflowReviews.getAssistantStatus(result.summary),
						).toHaveAttribute('aria-label', `Open | ${result.label}`);
						await reviewerN8n.workflowReviews.openAssistantResult(result.summary);
						await expect(reviewerN8n.workflowReviews.getAssistantDetail()).toHaveAttribute(
							'data-result-id',
							result.resultId,
						);
						const url = new URL(reviewerN8n.page.url());
						expect(url.pathname).toBe(`/inbox/assistant-results/${result.resultId}`);
						expect(url.searchParams.get('projectId')).toBe(project.id);
						expect(url.searchParams.get('workflowId')).toBe(result.workflowId);
					}
					await reviewerN8n.page.reload();
					await expect(reviewerN8n.workflowReviews.getAssistantDetail()).toHaveAttribute(
						'data-result-id',
						assistantResults[3].resultId,
					);
				});

				await test.step('Reviewer: an old review link still opens the approved review', async () => {
					await reviewerN8n.page.goto(`/reviews/${reviewId}?tab=changes`);
					await expect(reviewerN8n.page).toHaveURL(
						new RegExp(`/inbox/reviews/${reviewId}.*tab=changes`),
					);
					await expect(reviewerN8n.workflowReviews.getChangesDiff()).toContainText(
						'Schedule Trigger',
					);
					await expect(reviewerN8n.workflowReviews.getSelectedRequestStatus()).toHaveAttribute(
						'aria-label',
						'Closed | Approved',
					);
				});
			} finally {
				await authorN8n.page.context().close();
				await reviewerN8n.page.context().close();
				await authorApi.request.dispose();
				await reviewerApi.request.dispose();
			}
		});
	},
);
