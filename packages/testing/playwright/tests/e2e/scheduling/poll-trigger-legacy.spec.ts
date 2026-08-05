import { expectPollTriggerFires } from './poll-trigger-helpers';
import { makePollTriggerWorkflow } from './poll-trigger-workflow';
import { test } from '../../../fixtures/base';

// With the durable scheduler disabled (the default), poll triggers must still
// fire via the legacy in-memory cron.
test.use({ capability: { services: ['proxy'] } });

test.describe(
	'Poll Trigger (legacy in-memory scheduler) @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
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
