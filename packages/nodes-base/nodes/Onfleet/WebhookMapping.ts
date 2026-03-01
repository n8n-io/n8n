import type { OnfleetWebhooksMapping } from './interfaces';

export const webhookMapping: OnfleetWebhooksMapping = {
	taskStarted: {
		name: 'Task Started',
		value: 'taskStarted',
		key: 0,
	},
	taskEta: {
		name: 'Task ETA',
		value: 'taskEta',
		key: 1,
	},
	taskArrival: {
		name: 'Task Arrival',
		value: 'taskArrival',
		key: 2,
	},
	taskCompleted: {
		name: 'Task Completed',
		value: 'taskCompleted',
		key: 3,
	},
	taskFailed: {
		name: 'Task Failed',
		value: 'taskFailed',
		key: 4,
	},
	workerDuty: {
		name: 'Worker Duty',
		value: 'workerDuty',
		key: 5,
	},
	taskCreated: {
		name: 'Task Created',
		value: 'taskCreated',
		key: 6,
	},
	taskUpdated: {
		name: 'Task Updated',
		value: 'taskUpdated',
		key: 7,
	},
	taskDeleted: {
		name: 'Task Deleted',
		value: 'taskDeleted',
		key: 8,
	},
	taskAssigned: {
		name: 'Task Assigned',
		value: 'taskAssigned',
		key: 9,
	},
	taskUnassigned: {
		name: 'Task Unassigned',
		value: 'taskUnassigned',
		key: 10,
	},
	taskDelayed: {
		name: 'Task Delayed',
		value: 'taskDelayed',
		key: 12,
	},
	taskCloned: {
		name: 'Task Cloned',
		value: 'taskCloned',
		key: 13,
	},
	smsRecipientResponseMissed: {
		name: 'SMS Recipient Response Missed',
		value: 'smsRecipientResponseMissed',
		key: 14,
	},
	workerCreated: {
		name: 'Worker Created',
		value: 'workerCreated',
		key: 15,
	},
	workerDeleted: {
		name: 'Worker Deleted',
		value: 'workerDeleted',
		key: 16,
	},
	SMSRecipientOptOut: {
		name: 'SMS Recipient Opt Out',
		value: 'SMSRecipientOptOut',
		key: 17,
	},
};
