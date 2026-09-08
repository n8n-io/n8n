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
				name: 'Alert created',
				value: 'alert_create',
				description: 'Triggered when an alert is created',
			},
			{
				name: 'Alert deleted',
				value: 'alert_delete',
				description: 'Triggered when an alert is deleted',
			},
			{
				name: 'Alert updated',
				value: 'alert_update',
				description: 'Triggered when an alert is updated',
			},
			{
				name: 'Case created',
				value: 'case_create',
				description: 'Triggered when a case is created',
			},
			{
				name: 'Case deleted',
				value: 'case_delete',
				description: 'Triggered when a case is deleted',
			},
			{
				name: 'Case updated',
				value: 'case_update',
				description: 'Triggered when a case is updated',
			},
			{
				name: 'Log created',
				value: 'case_task_log_create',
				description: 'Triggered when a task log is created',
			},
			{
				name: 'Log deleted',
				value: 'case_task_log_delete',
				description: 'Triggered when a task log is deleted',
			},
			{
				name: 'Log updated',
				value: 'case_task_log_update',
				description: 'Triggered when a task log is updated',
			},
			{
				name: 'Observable created',
				value: 'case_artifact_create',
				description: 'Triggered when an observable is created',
			},
			{
				name: 'Observable deleted',
				value: 'case_artifact_delete',
				description: 'Triggered when an observable is deleted',
			},
			{
				name: 'Observable updated',
				value: 'case_artifact_update',
				description: 'Triggered when an observable is updated',
			},
			{
				name: 'Task created',
				value: 'case_task_create',
				description: 'Triggered when a task is created',
			},
			{
				name: 'Task deleted',
				value: 'case_task_delete',
				description: 'Triggered when a task is deleted',
			},
			{
				name: 'Task updated',
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
				name: 'Alert created',
				value: 'alert_create',
				description: 'Triggered when an alert is created',
			},
			{
				name: 'Alert deleted',
				value: 'alert_delete',
				description: 'Triggered when an alert is deleted',
			},
			{
				name: 'Alert updated',
				value: 'alert_update',
				description: 'Triggered when an alert is updated',
			},
			{
				name: 'Case created',
				value: 'case_create',
				description: 'Triggered when a case is created',
			},
			{
				name: 'Case deleted',
				value: 'case_delete',
				description: 'Triggered when a case is deleted',
			},
			{
				name: 'Case updated',
				value: 'case_update',
				description: 'Triggered when a case is updated',
			},
			{
				name: 'Log created',
				value: 'case_task_log_create',
				description: 'Triggered when a task log is created',
			},
			{
				name: 'Log deleted',
				value: 'case_task_log_delete',
				description: 'Triggered when a task log is deleted',
			},
			{
				name: 'Log updated',
				value: 'case_task_log_update',
				description: 'Triggered when a task log is updated',
			},
			{
				name: 'Observable created',
				value: 'case_artifact_create',
				description: 'Triggered when an observable is created',
			},
			{
				name: 'Observable deleted',
				value: 'case_artifact_delete',
				description: 'Triggered when an observable is deleted',
			},
			{
				name: 'Observable updated',
				value: 'case_artifact_update',
				description: 'Triggered when an observable is updated',
			},
			{
				name: 'Task created',
				value: 'case_task_create',
				description: 'Triggered when a task is created',
			},
			{
				name: 'Task updated',
				value: 'case_task_update',
				description: 'Triggered when a task is updated',
			},
		],
	},
];
