import type { INodeProperties } from 'n8n-workflow';

export const conditionFields: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Ticket',
				value: 'ticket',
			},
		],
		default: 'ticket',
	},
	{
		displayName: 'Field',
		name: 'field',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['ticket'],
			},
		},
		options: [
			{
				name: 'Assignee',
				value: 'assignee',
			},
			{
				name: 'Group',
				value: 'group',
			},
			{
				name: 'Priority',
				value: 'priority',
			},
			{
				name: 'Status',
				value: 'status',
			},
			{
				name: 'Type',
				value: 'type',
			},
		],
		default: 'status',
	},
	// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		options: [
			{
				name: 'Changed',
				value: 'changed',
			},
			{
				name: 'Changed From',
				value: 'value_previous',
			},
			{
				name: 'Changed To',
				value: 'value',
			},
			{
				name: 'Greater Than',
				value: 'greater_than',
			},
			{
				name: 'Is',
				value: 'is',
			},
			{
				name: 'Is Not',
				value: 'is_not',
			},
			{
				name: 'Less Than',
				value: 'less_than',
			},
			{
				name: 'Not Changed',
				value: 'not_changed',
			},
			{
				name: 'Not Changed From',
				value: 'not_value_previous',
			},
			{
				name: 'Not Changed To',
				value: 'not_value',
			},
		],
		displayOptions: {
			hide: {
				field: ['assignee'],
			},
		},
		default: 'is',
	},
	// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		options: [
			{
				name: 'Changed',
				value: 'changed',
			},
			{
				name: 'Changed From',
				value: 'value_previous',
			},
			{
				name: 'Changed To',
				value: 'value',
			},
			{
				name: 'Is',
				value: 'is',
			},
			{
				name: 'Is Not',
				value: 'is_not',
			},
			{
				name: 'Not Changed',
				value: 'not_changed',
			},
			{
				name: 'Not Changed From',
				value: 'not_value_previous',
			},
			{
				name: 'Not Changed To',
				value: 'not_value',
			},
		],
		displayOptions: {
			show: {
				field: ['assignee'],
			},
		},
		default: 'is',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'options',
		displayOptions: {
			show: {
				field: ['status'],
			},
			hide: {
				operation: ['changed', 'not_changed'],
				field: ['assignee', 'group', 'priority', 'type'],
			},
		},
		options: [
			{
				name: 'Closed',
				value: 'closed',
			},
			{
				name: 'New',
				value: 'new',
			},
			{
				name: 'Open',
				value: 'open',
			},
			{
				name: 'Pending',
				value: 'pending',
			},
			{
				name: 'Solved',
				value: 'solved',
			},
		],
		default: 'open',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'options',
		displayOptions: {
			show: {
				field: ['type'],
			},
			hide: {
				operation: ['changed', 'not_changed'],
				field: ['assignee', 'group', 'priority', 'status'],
			},
		},
		options: [
			{
				name: 'Question',
				value: 'question',
			},
			{
				name: 'Incident',
				value: 'incident',
			},
			{
				name: 'Problem',
				value: 'problem',
			},
			{
				name: 'Task',
				value: 'task',
			},
		],
		default: 'question',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'options',
		displayOptions: {
			show: {
				field: ['priority'],
			},
			hide: {
				operation: ['changed', 'not_changed'],
				field: ['assignee', 'group', 'type', 'status'],
			},
		},
		options: [
			{
				name: 'Low',
				value: 'low',
			},
			{
				name: 'Normal',
				value: 'normal',
			},
			{
				name: 'High',
				value: 'high',
			},
			{
				name: 'Urgent',
				value: 'urgent',
			},
		],
		default: 'low',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Value',
		name: 'value',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getGroups',
		},
		displayOptions: {
			show: {
				field: ['group'],
			},
			hide: {
				field: ['assignee', 'priority', 'type', 'status'],
			},
		},
		default: '',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Value',
		name: 'value',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		displayOptions: {
			show: {
				field: ['assignee'],
			},
			hide: {
				field: ['group', 'priority', 'type', 'status'],
			},
		},
		default: '',
	},
];
