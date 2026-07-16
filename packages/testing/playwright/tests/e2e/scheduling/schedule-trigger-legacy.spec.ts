import { expectScheduleTriggerFires } from './schedule-trigger-helpers';
import { makeScheduleTriggerWorkflow } from './schedule-trigger-workflow';
import { test } from '../../../fixtures/base';

// Flag-off parity control: with the durable scheduler disabled (default), the
// same workflow must still fire via the legacy in-memory path. Guards against the
// durable work regressing the common case.
test.describe(
	'Schedule Trigger (legacy in-memory scheduler)',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should fire an activated Schedule Trigger through the legacy in-memory path', async ({
			api,
		}) => {
			await expectScheduleTriggerFires(api, makeScheduleTriggerWorkflow());
		});
	},
);
