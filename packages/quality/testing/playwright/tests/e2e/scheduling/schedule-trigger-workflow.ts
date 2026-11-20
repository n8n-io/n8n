import { workflow, trigger, node } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';

// Builds a Schedule Trigger -> NoOp workflow firing every couple of seconds, so a
// trigger-mode execution appears quickly and the observation windows stay short.
export const makeScheduleTriggerWorkflow = (secondsInterval = 2) => {
	const scheduleTrigger = trigger({
		type: 'n8n-nodes-base.scheduleTrigger',
		version: 1.3,
		config: {
			name: 'Schedule Trigger',
			parameters: {
				rule: {
					interval: [{ field: 'seconds', secondsInterval }],
				},
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

	return workflow(nanoid(), `Schedule Trigger Test ${nanoid()}`).add(scheduleTrigger.to(noOp));
};

// Same shape but driven by a raw cron expression (the `cronExpression` field
// takes a separate provisioning branch from the fixed-interval fields).
export const makeCronScheduleTriggerWorkflow = (expression = '*/2 * * * * *') => {
	const scheduleTrigger = trigger({
		type: 'n8n-nodes-base.scheduleTrigger',
		version: 1.3,
		config: {
			name: 'Schedule Trigger',
			parameters: {
				rule: {
					interval: [{ field: 'cronExpression', expression }],
				},
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

	return workflow(nanoid(), `Schedule Trigger Cron Test ${nanoid()}`).add(scheduleTrigger.to(noOp));
};
