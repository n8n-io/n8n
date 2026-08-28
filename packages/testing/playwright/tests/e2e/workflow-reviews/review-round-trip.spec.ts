import { nanoid } from 'nanoid';

import { EDIT_FIELDS_SET_NODE_NAME } from '../../../config/constants';
import { expect, test } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

// Turning reviews on changes what the Publish button does for every workflow on
// the instance, so this spec needs an instance of its own.
test.use({ capability: { env: { TEST_ISOLATION: 'workflow-reviews' } } });

/** Approval publishes the workflow, so it needs a trigger that can be activated. */
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

/**
 * The reviews module is only started at boot, and only if the license allows it,
 * so `enableFeature` alone cannot switch it on. Check it up front to fail with a
 * clear reason instead of a 404 halfway through the flow.
 */
async function assertReviewsModuleActive(api: ApiHelpers): Promise<void> {
	expect(
		await api.getActiveModules(),
		'the workflow-reviews module is not active: the instance needs a license granting feat:workflowReviews at startup',
	).toContain('workflow-reviews');
}

test.describe(
	'Workflow reviews @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		test('author and reviewer complete a review round trip', async ({ n8n, api }) => {
			await api.enableFeature('workflowReviews');
			await api.enableFeature('personalSpacePolicy');
			await api.securitySettings.setWorkflowReviewsEnabled(true);
			await assertReviewsModuleActive(api);

			// Emails are lowercased when saved, and the reviewer picker filters
			// case-sensitively, so a mixed-case email would match nothing.
			const author = await api.publicApi.createUser({
				email: `author-${nanoid().toLowerCase()}@test.com`,
			});
			const reviewer = await api.publicApi.createUser({
				email: `reviewer-${nanoid().toLowerCase()}@test.com`,
			});
			// The author needs workflow:publish to submit, the reviewer workflow:read to decide
			const project = await api.projects.createProject(`Reviews ${nanoid(8)}`);
			await api.projects.addUserToProject(project.id, author.id, 'project:admin');
			await api.projects.addUserToProject(project.id, reviewer.id, 'project:editor');

			const authorApi = await api.createApiForUser(author);
			const workflowName = `Review Workflow ${nanoid(8)}`;
			const workflow = await authorApi.workflows.createWorkflow(
				{ name: workflowName, nodes: [scheduleTriggerNode()], connections: {}, settings: {} },
				project.id,
			);

			const reviewTitle = `Review ${nanoid(8)}`;
			const authorN8n = await n8n.start.withUser(author);
			const reviewerN8n = await n8n.start.withUser(reviewer);

			// --- The author submits the saved version for review ---
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

			// --- The reviewer finds it in the inbox, comments, and requests changes ---
			await reviewerN8n.workflowReviews.goto();
			await reviewerN8n.workflowReviews.openRequest(reviewTitle);
			await expect(reviewerN8n.workflowReviews.getSelectedRequestTitle()).toHaveText(reviewTitle);
			await expect(reviewerN8n.workflowReviews.getRequestRow(reviewTitle)).toContainText(
				workflowName,
			);

			const comment = `Please rename the trigger ${nanoid(6)}`;
			await reviewerN8n.workflowReviews.postComment(comment);
			await expect(
				reviewerN8n.workflowReviews.getActivityEntries().filter({ hasText: comment }),
			).toBeVisible();

			await reviewerN8n.workflowReviews.requestChanges('Renaming needed before this goes live');

			// --- The author sees the decision, pushed to the open editor ---
			await expect(authorN8n.workflowReviewControls.getStatusPill()).toHaveText(
				'Changes requested',
				{ timeout: 15_000 },
			);

			// --- The author saves a new version and pushes it into the review ---
			await authorN8n.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
			await authorN8n.canvas.waitForSaveWorkflowCompleted();
			await expect(authorN8n.workflowReviewControls.getStatusPill()).toHaveText('Update review');
			await authorN8n.workflowReviewControls.submitChangesToReview('Release candidate 2');

			// --- The reviewer approves, which publishes the reviewed version ---
			await reviewerN8n.workflowReviews.approve('Looks good now');
			await expect(reviewerN8n.workflowReviews.getSelectedRequestStatus()).toHaveAttribute(
				'aria-label',
				'Closed • Approved',
			);
			// Deciding refetches the review, so this summary has to appear on its own
			await expect(reviewerN8n.workflowReviews.getClosedCallout()).toBeVisible();

			// Approval publishes the workflow on the author's behalf. Reloading because an
			// editor that was already open does not pick this up by itself.
			await authorN8n.page.reload();
			await authorN8n.canvas.waitForCanvasReady();
			await expect(authorN8n.canvas.getPublishedIndicator()).toBeVisible();
		});
	},
);
