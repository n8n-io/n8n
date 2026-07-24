import { workflow, trigger, node } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';

const buildWorkflow = (path: string, pollTimesItem: Record<string, unknown>) => {
	const pollTrigger = trigger({
		type: 'n8n-nodes-base.e2eTestPollingTrigger',
		version: 1,
		config: {
			name: 'E2E Test Polling Trigger',
			parameters: {
				url: `http://e2e-poll-test.local${path}`,
				pollTimes: { item: [pollTimesItem] },
			},
		},
	});

	const noOp = node({
		type: 'n8n-nodes-base.noOp',
		version: 1,
		config: {
			name: 'NoOp',
		},
	});

	return workflow(nanoid(), `Poll Trigger Test ${nanoid()}`).add(pollTrigger.to(noOp));
};

// Builds an E2E Test Polling Trigger -> NoOp workflow, polling every minute (the
// fastest interval `isSubMinuteCron` allows). The trigger polls a URL routed
// through the proxy capability's MockServer, so the test controls exactly what
// each poll tick sees by reprogramming the expectation for `path` between
// ticks, instead of racing real external state.
export const makePollTriggerWorkflow = (path: string) =>
	buildWorkflow(path, { mode: 'everyMinute' });

// Same shape but driven by a raw cron expression (the `custom` mode takes a
// separate provisioning branch from the fixed-interval modes).
export const makeCronPollTriggerWorkflow = (path: string, cronExpression = '0 * * * * *') =>
	buildWorkflow(path, { mode: 'custom', cronExpression });
