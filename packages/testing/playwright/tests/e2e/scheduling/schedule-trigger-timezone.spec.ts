import type { IWorkflowBase } from 'n8n-workflow';

import { makeScheduleTriggerWorkflow } from './schedule-trigger-workflow';
import { test, expect } from '../../../fixtures/base';

// Instance timezone set to a non-UTC zone. A workflow that leaves its timezone on
// the `'DEFAULT'` sentinel must have it resolved to the instance timezone when the
// durable path builds the trigger item; the bug was `'DEFAULT'` leaking straight
// into `moment.tz`, which silently resolves an unknown zone to UTC.
const INSTANCE_TIMEZONE = 'America/New_York';

test.use({
	capability: {
		env: {
			N8N_SCHEDULER_ENABLED: 'true',
			N8N_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			N8N_SCHEDULER_SWEEP_INTERVAL: '1',
			N8N_SCHEDULER_EXECUTOR_INTERVAL: '1',
			GENERIC_TIMEZONE: INSTANCE_TIMEZONE,
		},
	},
});

test.describe(
	'Schedule Trigger timezone (durable scheduler)',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test("should resolve the workflow's DEFAULT timezone to the instance timezone", async ({
			api,
		}) => {
			const wf = makeScheduleTriggerWorkflow();
			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition({
				...(wf.toJSON() as IWorkflowBase),
				settings: { timezone: 'DEFAULT' },
			});

			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			const execution = await api.workflows.waitForExecution(workflowId, 60_000, 'trigger');
			expect(execution.status).toBe('success');

			const full = await api.workflows.getExecution(execution.id, { redactExecutionData: false });

			// The emitted item's Timezone field is `<zone> (UTC<offset>)`. Resolved
			// correctly it names the instance zone; the pre-fix leak resolved the
			// `'DEFAULT'` sentinel to UTC. America/New_York is never UTC+00:00 in any
			// season, so asserting the zone name and a non-UTC offset is DST-proof
			// without hardcoding -04:00/-05:00.
			expect(full.data).toContain(INSTANCE_TIMEZONE);
			expect(full.data).not.toContain('DEFAULT (UTC');
			expect(full.data).not.toContain('(UTC+00:00)');
		});
	},
);
