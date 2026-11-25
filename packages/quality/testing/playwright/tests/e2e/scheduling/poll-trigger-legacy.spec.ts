import { expectPollTriggerFires } from './poll-trigger-helpers';
import { makePollTriggerWorkflow } from './poll-trigger-workflow';
import { test } from '../../../fixtures/base';

// With durable poll triggers disabled, poll triggers must still fire via the
// legacy in-memory cron.
test.use({
	capability: {
		services: ['proxy'],
		env: { N8N_SCHEDULER_POLL_TRIGGERS_ENABLED: 'false' },
	},
});

test.describe(
	'Poll Trigger (legacy in-memory scheduler)',
	{
		annotation: [{ type: 'owner', description: 'Core Application' }],
	},
	() => {
		test('should fire an activated poll trigger through the legacy in-memory path', async ({
			api,
			services,
		}) => {
			await expectPollTriggerFires(api, services.proxy, makePollTriggerWorkflow);
		});
	},
);
