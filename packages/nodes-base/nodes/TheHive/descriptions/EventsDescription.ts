import type { INodeProperties } from 'n8n-workflow';

export const eventsDescription: INodeProperties[] = [
	{
		displayName: 'Events',
		name: 'events',
		type: 'multiOptions',
		default: [],
		required: true,
		description: 'Events types',
		displayOptions: {
			show: {
				'@version': [1],
			},
		},
		options: [
			{
				name: '*',
				value: '*',
				description: 'Any time any event is triggered (Wildcard Event)',
			},
			{
				name: 'Alert Created',
				value: 'alert_create',
				description: 'Triggered when an alert is created',
			},
			{
				name: 'Alert Deleted',
				value: 'alert_delete',
				description: 'Triggered when an alert is deleted',
			},
			{
				name: 'Alert Updated',
				value: 'alert_update',
				description: 'Triggered when an alert is updated',
			},
			{
				name: 'Case Created',
				value: 'case_create',
				description: 'Triggered when a case is created',
			},
			{
				name: 'Case Deleted',
				value: 'case_delete',
				description: 'Triggered when a case is deleted',
			},
			{
				name: 'Case Updated',
				value: 'case_update',
				description: 'Triggered when a case is updated',
			},
			{
				name: 'Log Created',
				value: 'case_task_log_create',
				description: 'Triggered when a task log is created',
			},
			{
				name: 'Log Deleted',
				value: 'case_task_log_delete',
				description: 'Triggered when a task log is deleted',
			},
			{
				name: 'Log Updated',
				value: 'case_task_log_update',
				description: 'Triggered when a task log is updated',
			},
			{
				name: 'Observable Created',
				value: 'case_artifact_create',
				description: 'Triggered when an observable is created',
			},
			{
				name: 'Observable Deleted',
				value: 'case_artifact_delete',
				description: 'Triggered when an observable is deleted',
			},
			{
				name: 'Observable Updated',
				value: 'case_artifact_update',
				description: 'Triggered when an observable is updated',
			},
			{
				name: 'Task Created',
				value: 'case_task_create',
				description: 'Triggered when a task is created',
			},
			{
				name: 'Task Deleted',
				value: 'case_task_delete',
				description: 'Triggered when a task is deleted',
			},
			{
				name: 'Task Updated',
				value: 'case_task_update',
				description: 'Triggered when a task is updated',
			},
		],
	},
	{
		displayName: 'Events',
		name: 'events',
		type: 'multiOptions',
		default: [],
		required: true,
		description: 'Events types',
		displayOptions: {
			show: {
				'@version': [2],
			},
		},
		options: [
			{
				name: '*',
				value: '*',
				description: 'Any time any event is triggered (Wildcard Event)',
			},
			{
				name: 'Alert Created',
				value: 'alert_create',
				description: 'Triggered when an alert is created',
			},
			{
				name: 'Alert Deleted',
				value: 'alert_delete',
				description: 'Triggered when an alert is deleted',
			},
			{
				name: 'Alert Updated',
				value: 'alert_update',
				description: 'Triggered when an alert is updated',
			},
			{
				name: 'Case Created',
				value: 'case_create',
				description: 'Triggered when a case is created',
			},
			{
				name: 'Case Deleted',
				value: 'case_delete',
				description: 'Triggered when a case is deleted',
			},
			{
				name: 'Case Updated',
				value: 'case_update',
				description: 'Triggered when a case is updated',
			},
			{
				name: 'Log Created',
				value: 'case_task_log_create',
				description: 'Triggered when a task log is created',
			},
			{
				name: 'Log Deleted',
				value: 'case_task_log_delete',
				description: 'Triggered when a task log is deleted',
			},
			{
				name: 'Log Updated',
				value: 'case_task_log_update',
				description: 'Triggered when a task log is updated',
			},
			{
				name: 'Observable Created',
				value: 'case_artifact_create',
				description: 'Triggered when an observable is created',
			},
			{
				name: 'Observable Deleted',
				value: 'case_artifact_delete',
				description: 'Triggered when an observable is deleted',
			},
			{
				name: 'Observable Updated',
				value: 'case_artifact_update',
				description: 'Triggered when an observable is updated',
			},
			{
				name: 'Task Created',
				value: 'case_task_create',
				description: 'Triggered when a task is created',
			},
			{
				name: 'Task Updated',
				value: 'case_task_update',
				description: 'Triggered when a task is updated',
			},
		],
	},
];
