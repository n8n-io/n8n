import {
	INodeProperties
} from 'n8n-workflow';

export const containerOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'containers',
				],
			},
		},
		options: [
			{
				name: 'Insert tasks',
				value: 'add',
				description: 'Insert tasks at index.',
			},
			{
				name: 'Update tasks',
				value: 'update',
				description: 'Fully replace a container\'s tasks.',
			},
			{
				name: 'Get container',
				value: 'get',
				description: 'Get container information.',
			},
		],
		default: 'get',
	},
] as INodeProperties[];

const containerTypeField = {
	displayName: 'Container',
	name: 'containerType',
	type: 'options',
	options: [
		{ name: 'Organizations', value: 'organizations' },
		{ name: 'Teams', value: 'teams' },
		{ name: 'Workers', value: 'workers' },
	],
	default: '',
	description: 'Container type.',
} as INodeProperties;

const containerIdField = {
	displayName: 'ID',
	name: 'containerId',
	type: 'string',
	default: '',
	description: 'The object ID according to the container chosen.',
} as INodeProperties;

const insertTypeField = {
	displayName: 'Insert type',
	name: 'type',
	type: 'options',
	options: [
		{ name: 'Append', value: -1 },
		{ name: 'Prepend', value: 0 },
		{ name: 'At specific index', value: 1 },
	],
	default: '',
	description: 'The index given indicates the position where the tasks are going to be inserted.',
} as INodeProperties;

const indexField = {
	displayName: 'Index',
	name: 'index',
	type: 'number',
	default: '',
	description: 'The index given indicates the position where the tasks are going to be inserted.',
} as INodeProperties;

const tasksField = {
	displayName: 'Tasks (JSON)',
	name: 'tasks',
	type: 'json',
	default: '[]',
	description: 'Array witht the task\'s ID that are going to be used in JSON format.',
} as INodeProperties;

export const containerFields = [
	{
		...containerTypeField,
		displayOptions: {
			show: {
				resource: [
					'containers',
				],
				operation: [
					'get', 'add', 'update',
				],
			},
		},
		required: true,
	},
	{
		...containerIdField,
		displayOptions: {
			show: {
				resource: [
					'containers',
				],
				operation: [
					'get', 'add', 'update',
				],
			},
		},
		required: true,
	},
	{
		...insertTypeField,
		displayOptions: {
			show: {
				resource: [
					'containers',
				],
				operation: [
					'add',
				],
			},
		},
		required: true,
	},
	{
		...indexField,
		displayOptions: {
			show: {
				resource: [
					'containers',
				],
				operation: [
					'add',
				],
				type: [
					1,
				],
			},
		},
		required: true,
	},
	{
		...tasksField,
		displayOptions: {
			show: {
				resource: [
					'containers',
				],
				operation: [
					'add', 'update',
				],
			},
		},
		required: true,
	},
] as INodeProperties[];
