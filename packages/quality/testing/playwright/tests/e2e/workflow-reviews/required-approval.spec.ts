import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';
import { assertReviewsModuleActive, scheduleTriggerNode } from './review-helpers';

// "Always required" changes publishing for every team workflow on the instance,
// so this spec needs an instance of its own.
test.use({ capability: { env: { TEST_ISOLATION: 'workflow-reviews-required' } } });

test.describe(
	'Workflow reviews required approval @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		test('a team workflow goes live only through an approved review', async ({ n8n, api }) => {
			await api.enableFeature('workflowReviews');
			await api.enableFeature('personalSpacePolicy');
			await api.securitySettings.setWorkflowReviewsEnabled(true);
			await api.securitySettings.setWorkflowReviewsAlwaysRequired(false);
			await assertReviewsModuleActive(api);

			// Emails are lowercased when saved, and the reviewer picker filters case-sensitively
			const author = await api.publicApi.createUser({
				email: `author-${nanoid().toLowerCase()}@test.com`,
			});
			const reviewer = await api.publicApi.createUser({
				email: `reviewer-${nanoid().toLowerCase()}@test.com`,
			});
			const project = await api.projects.createProject(`Required reviews ${nanoid(8)}`);
			await api.projects.addUserToProject(project.id, author.id, 'project:editor');
			await api.projects.addUserToProject(project.id, reviewer.id, 'project:editor');

			const authorApi = await api.createApiForUser(author);
			const workflow = await authorApi.workflows.createWorkflow(
				{
					name: `Required Review Workflow ${nanoid(8)}`,
					nodes: [scheduleTriggerNode()],
					connections: {},
					settings: {},
				},
				project.id,
			);

			// --- A project that requires approval turns Publish into Submit for review ---
			const authorN8n = await n8n.start.withUser(author);
			await authorN8n.start.fromExistingWorkflow(workflow.id);
			await expect(authorN8n.canvas.getOpenPublishModalButton()).toHaveText('Publish');

			await api.projects.setWorkflowReviewApprovalRequired(project.id, true);
			await authorN8n.start.fromExistingWorkflow(workflow.id);
			await expect(authorN8n.canvas.getOpenPublishModalButton()).toHaveText('Submit for review');
			await api.projects.setWorkflowReviewApprovalRequired(project.id, false);

			await api.securitySettings.setWorkflowReviewsAlwaysRequired(true);

			// --- The server refuses a direct publish of the unreviewed version ---
			const refused = await authorApi.workflows.activateRaw(workflow.id, workflow.versionId);
			expect(refused.status()).toBe(409);
			expect((await refused.json()).meta).toMatchObject({ reason: 'review_required' });

			// --- The editor offers only Submit for review, without the publish choice ---
			const reviewTitle = `Review ${nanoid(8)}`;
			await authorN8n.start.fromExistingWorkflow(workflow.id);
			await expect(authorN8n.canvas.getOpenPublishModalButton()).toHaveText('Submit for review');
			await authorN8n.canvas.getOpenPublishModalButton().click();
			await authorN8n.workflowReviewControls.submitForReview({
				versionName: 'Release candidate',
				title: reviewTitle,
				reviewerEmail: reviewer.email,
			});
			await expect(authorN8n.workflowReviewControls.getStatusPill()).toHaveText(
				'Waiting for review',
			);

			// --- The reviewer approves, which publishes the reviewed version ---
			const reviewerN8n = await n8n.start.withUser(reviewer);
			await reviewerN8n.workflowReviews.goto();
			await reviewerN8n.workflowReviews.openRequest(reviewTitle);
			await reviewerN8n.workflowReviews.approve();
			await expect(reviewerN8n.workflowReviews.getClosedCallout()).toBeVisible();

			await authorN8n.page.reload();
			await authorN8n.canvas.waitForCanvasReady();
			await expect(authorN8n.canvas.getPublishedIndicator()).toBeVisible();
		});
	},
);
