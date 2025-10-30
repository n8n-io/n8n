import type { INodeProperties } from 'n8n-workflow';

import { TLPs } from '../helpers/interfaces';

export const returnAllAndLimit: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
	},
];

export const responderOptions: INodeProperties = {
	displayName: 'Responder Name or ID',
	name: 'responder',
	type: 'options',
	description:
		'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	required: true,
	default: '',
	typeOptions: {
		loadOptionsDependsOn: ['id', 'id.value'],
		loadOptionsMethod: 'loadResponders',
	},
	displayOptions: {
		hide: {
			id: [''],
		},
	},
};

export const tlpOptions: INodeProperties = {
	displayName: 'Traffict Light Protocol (TLP)',
	name: 'tlp',
	type: 'options',
	default: 2,
	options: [
		{
			name: 'White',
			value: TLPs.white,
		},
		{
			name: 'Green',
			value: TLPs.green,
		},
		{
			name: 'Amber',
			value: TLPs.amber,
		},
		{
			name: 'Red',
			value: TLPs.red,
		},
	],
};

export const severityOptions: INodeProperties = {
	displayName: 'Severity',
	name: 'severity',
	type: 'options',
	options: [
		{
			name: 'Low',
			value: 1,
		},
		{
			name: 'Medium',
			value: 2,
		},
		{
			name: 'High',
			value: 3,
		},
		{
			name: 'Critical',
			value: 4,
		},
	],
	default: 2,
	description: 'Severity of the alert. Default=Medium.',
};

export const observableTypeOptions: INodeProperties = {
	// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
	displayName: 'Data Type',
	name: 'dataType',
	type: 'options',
	default: '',
	typeOptions: {
		loadOptionsMethod: 'loadObservableTypes',
	},
	description:
		'Type of the observable. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
};

export const alertStatusOptions: INodeProperties = {
	displayName: 'Status',
	name: 'status',
	type: 'options',
	options: [
		{
			name: 'New',
			value: 'New',
		},
		{
			name: 'Updated',
			value: 'Updated',
		},
		{
			name: 'Ignored',
			value: 'Ignored',
		},
		{
			name: 'Imported',
			value: 'Imported',
		},
	],
	default: 'New',
	description: 'Status of the alert',
};

export const caseStatusOptions: INodeProperties = {
	displayName: 'Status',
	name: 'status',
	type: 'options',
	options: [
		{
			name: 'Open',
			value: 'Open',
		},
		{
			name: 'Resolved',
			value: 'Resolved',
		},
		{
			name: 'Deleted',
			value: 'Deleted',
		},
	],
	default: 'Open',
};

export const observableStatusOptions: INodeProperties = {
	displayName: 'Status',
	name: 'status',
	type: 'options',
	default: 'Ok',
	options: [
		{
			name: 'Ok',
			value: 'Ok',
		},
		{
			name: 'Deleted',
			value: 'Deleted',
		},
	],
	description: 'Status of the observable. Default=Ok.',
};

export const taskStatusOptions: INodeProperties = {
	displayName: 'Status',
	name: 'status',
	type: 'options',
	default: 'Waiting',
	options: [
		{
			name: 'Cancel',
			value: 'Cancel',
		},
		{
			name: 'Completed',
			value: 'Completed',
		},
		{
			name: 'InProgress',
			value: 'InProgress',
		},
		{
			name: 'Waiting',
			value: 'Waiting',
		},
	],
	description: 'Status of the task. Default=Waiting.',
};

export const searchOptions: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add option',
	default: {},
	options: [
		{
			displayName: 'Return Count',
			name: 'returnCount',
			type: 'boolean',
			description: 'Whether to return only the count of results',
			default: false,
			displayOptions: {
				hide: {
					'/returnAll': [false],
				},
			},
		},
		{
			displayName: 'Extra Data',
			name: 'extraData',
			type: 'multiOptions',
			description: 'Additional data to include in the response',
			options: [
				{
					name: 'isOwner',
					value: 'isOwner',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'links',
					value: 'links',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'permissions',
					value: 'permissions',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'seen',
					value: 'seen',
				},
				{
					name: 'shareCount',
					value: 'shareCount',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'shares',
					value: 'shares',
				},
			],
			default: [],
			displayOptions: {
				show: {
					'/resource': ['observable'],
				},
				hide: {
					returnCount: [true],
				},
			},
		},
		{
			displayName: 'Extra Data',
			name: 'extraData',
			type: 'multiOptions',
			description: 'Additional data to include in the response',
			options: [
				{
					name: 'actionRequired',
					value: 'actionRequired',
				},
				{
					name: 'actionRequiredMap',
					value: 'actionRequiredMap',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'case',
					value: 'case',
				},
				{
					name: 'caseId',
					value: 'caseId',
				},
				{
					name: 'caseTemplate',
					value: 'caseTemplate',
				},
				{
					name: 'caseTemplateId',
					value: 'caseTemplateId',
				},
				{
					name: 'shareCount',
					value: 'shareCount',
				},
			],
			default: [],
			displayOptions: {
				show: {
					'/resource': ['task'],
				},
				hide: {
					returnCount: [true],
				},
			},
		},
		{
			displayName: 'Extra Data',
			name: 'extraData',
			type: 'multiOptions',
			description: 'Additional data to include in the response',
			options: [
				{
					name: 'caseNumber',
					value: 'caseNumber',
				},
				{
					name: 'importDate',
					value: 'importDate',
				},
				{
					name: 'procedureCount',
					value: 'procedureCount',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'status',
					value: 'status',
				},
			],
			default: [],
			displayOptions: {
				show: {
					'/resource': ['alert'],
				},
				hide: {
					returnCount: [true],
				},
			},
		},
		{
			displayName: 'Extra Data',
			name: 'extraData',
			type: 'multiOptions',
			description: 'Additional data to include in the response',
			options: [
				{
					name: 'actionRequired',
					value: 'actionRequired',
				},
				{
					name: 'alertCount',
					value: 'alertCount',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'alerts',
					value: 'alerts',
				},
				{
					name: 'attachmentCount',
					value: 'attachmentCount',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'contributors',
					value: 'contributors',
				},
				{
					name: 'handlingDuration',
					value: 'computed.handlingDuration',
				},
				{
					name: 'handlingDurationInDays',
					value: 'computed.handlingDurationInDays',
				},
				{
					name: 'handlingDurationInHours',
					value: 'computed.handlingDurationInHours',
				},
				{
					name: 'handlingDurationInMinutes',
					value: 'computed.handlingDurationInMinutes',
				},
				{
					name: 'handlingDurationInSeconds',
					value: 'computed.handlingDurationInSeconds',
				},
				{
					name: 'isOwner',
					value: 'isOwner',
				},
				{
					name: 'observableStats',
					value: 'observableStats',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'permissions',
					value: 'permissions',
				},
				{
					name: 'procedureCount',
					value: 'procedureCount',
				},
				{
					name: 'shareCount',
					value: 'shareCount',
				},
				{
					name: 'similarAlerts',
					value: 'similarAlerts',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'status',
					value: 'status',
				},
				{
					name: 'taskStats',
					value: 'taskStats',
				},
			],
			default: [],
			displayOptions: {
				show: {
					'/resource': ['case'],
				},
				hide: {
					returnCount: [true],
				},
			},
		},
		{
			displayName: 'Extra Data',
			name: 'extraData',
			type: 'multiOptions',
			description: 'Additional data to include in the response',
			options: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'links',
					value: 'links',
				},
			],
			default: [],
			displayOptions: {
				show: {
					'/resource': ['comment'],
				},
				hide: {
					returnCount: [true],
				},
			},
		},
		{
			displayName: 'Extra Data',
			name: 'extraData',
			type: 'multiOptions',
			description: 'Additional data to include in the response',
			options: [
				{
					name: 'actionCount',
					value: 'actionCount',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'case',
					value: 'case',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'task',
					value: 'task',
				},
				{
					name: 'taskId',
					value: 'taskId',
				},
			],
			default: [],
			displayOptions: {
				show: {
					'/resource': ['log'],
				},
				hide: {
					returnCount: [true],
				},
			},
		},
		{
			displayName: 'Extra Data',
			name: 'extraData',
			type: 'string',
			description: 'Additional data to include in the response',
			default: '',
			requiresDataPath: 'multiple',
			displayOptions: {
				show: {
					'/resource': ['query'],
				},
				hide: {
					returnCount: [true],
				},
			},
		},
	],
};

export const attachmentsUi: INodeProperties = {
	displayName: 'Attachments',
	name: 'attachmentsUi',
	placeholder: 'Add Attachment',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	options: [
		{
			name: 'values',
			displayName: 'Values',
			values: [
				{
					displayName: 'Attachment Field Name',
					name: 'field',
					type: 'string',
					default: 'data',
					description: 'Add the field name from the input node',
					hint: 'The name of the field with the attachment in the node input',
				},
			],
		},
	],
	default: {},
	description: 'Array of supported attachments to add to the message',
};
