import {
	INodeProperties,
 } from 'n8n-workflow';

export const conditionFields: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
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
				'resource': [
					'ticket',
				],
			},
		},
		options: [
			{
				name: 'Status',
				value: 'status',
			},
			{
				name: 'Type',
				value: 'type',
			},
			{
				name: 'Priority',
				value: 'priority',
			},
			{
				name: 'Group',
				value: 'group',
			},
			{
				name: 'Assignee',
				value: 'assignee',
			},
		],
		default: 'status',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		options: [
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
				name: 'Greater Than',
				value: 'greater_than',
			},
			{
				name: 'Changed',
				value: 'changed',
			},
			{
				name: 'Changed To',
				value: 'value',
			},
			{
				name: 'Changed From',
				value: 'value_previous',
			},
			{
				name: 'Not Changed',
				value: 'not_changed',
			},
			{
				name: 'Not Changed To',
				value: 'not_value',
			},
					{
				name: 'Not Changed From',
				value: 'not_value_previous',
			},
		],
		displayOptions: {
			hide: {
				field: [
					'assignee',
				],
			},
		},
		default: 'is',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		options: [
			{
				name: 'Is',
				value: 'is',
			},
			{
				name: 'Is Not',
				value: 'is_not',
			},
			{
				name: 'Changed',
				value: 'changed',
			},
			{
				name: 'Changed To',
				value: 'value',
			},
			{
				name: 'Changed From',
				value: 'value_previous',
			},
			{
				name: 'Not Changed',
				value: 'not_changed',
			},
			{
				name: 'Not Changed To',
				value: 'not_value',
			},
					{
				name: 'Not Changed From',
				value: 'not_value_previous',
			},
		],
		displayOptions: {
			show: {
				field: [
					'assignee',
				],
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
				field: [
					'status',
				],
			},
			hide: {
				operation:[
					'changed',
					'not_changed',
				],
				field: [
					'assignee',
					'group',
					'priority',
					'type',
				],
			},
		},
		options: [
			{
				name: 'Open',
				value: 'open',
			},
			{
				name: 'New',
				value: 'new',
			},
			{
				name: 'Pending',
				value: 'pending',
			},
			{
				name: 'Solved',
				value: 'solved',
			},
			{
				name: 'Closed',
				value: 'closed',
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
				field: [
					'type',
				],
			},
			hide: {
				operation:[
					'changed',
					'not_changed',
				],
				field: [
					'assignee',
					'group',
					'priority',
					'status',
				],
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
				field: [
					'priority',
				],
			},
			hide: {
				operation:[
					'changed',
					'not_changed',
				],
				field: [
					'assignee',
					'group',
					'type',
					'status',
				],
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
		displayName: 'Value',
		name: 'value',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getGroups',
		},
		displayOptions: {
			show: {
				field: [
					'group',
				],
			},
			hide: {
				field: [
					'assignee',
					'priority',
					'type',
					'status',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		displayOptions: {
			show: {
				field: [
					'assignee',
				],
			},
			hide: {
				field: [
					'group',
					'priority',
					'type',
					'status',
				],
			},
		},
		default: '',
	},
];
