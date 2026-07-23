import { nanoid } from 'nanoid';

import { expectPollTriggerFires } from './poll-trigger-helpers';
import { makePollTriggerWorkflow } from './poll-trigger-workflow';
import { test } from '../../../fixtures/base';

// Flag-off parity control: with the durable scheduler disabled (default), the
// same poll trigger workflow must still fire via the legacy in-memory cron.
// Guards against the durable work regressing the common case.
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
			const path = `/${nanoid()}`;
			await expectPollTriggerFires(api, services.proxy, path, makePollTriggerWorkflow(path));
		});
	},
);
