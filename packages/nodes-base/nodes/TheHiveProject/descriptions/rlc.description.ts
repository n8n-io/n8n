import type { INodeProperties } from 'n8n-workflow';

export const caseRLC: INodeProperties = {
	displayName: 'Case',
	name: 'caseId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a case...',
			typeOptions: {
				searchListMethod: 'caseSearch',
				searchable: true,
			},
		},
		{
			displayName: 'Link',
			name: 'url',
			type: 'string',
			extractValue: {
				type: 'regex',
				regex: 'https:\\/\\/.+\\/cases\\/(~[0-9]{1,})\\/details',
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex: 'https:\\/\\/.+\\/cases\\/(~[0-9]{1,})\\/details',
						errorMessage: 'Not a valid Case URL',
					},
				},
			],
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. ~123456789',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '(~[0-9]{1,})',
						errorMessage: 'Not a valid Case ID',
					},
				},
			],
		},
	],
};

export const alertRLC: INodeProperties = {
	displayName: 'Alert',
	name: 'alertId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a alert...',
			typeOptions: {
				searchListMethod: 'alertSearch',
				searchable: true,
			},
		},
		{
			displayName: 'Link',
			name: 'url',
			type: 'string',
			extractValue: {
				type: 'regex',
				regex: 'https:\\/\\/.+\\/alerts\\/(~[0-9]{1,})\\/details',
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex: 'https:\\/\\/.+\\/alerts\\/(~[0-9]{1,})\\/details',
						errorMessage: 'Not a valid Alert URL',
					},
				},
			],
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. ~123456789',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '(~[0-9]{1,})',
						errorMessage: 'Not a valid Alert ID',
					},
				},
			],
		},
	],
};

export const taskRLC: INodeProperties = {
	displayName: 'Task',
	name: 'taskId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a task...',
			typeOptions: {
				searchListMethod: 'taskSearch',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. ~123456789',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '(~[0-9]{1,})',
						errorMessage: 'Not a valid Task ID',
					},
				},
			],
		},
	],
};

export const pageRLC: INodeProperties = {
	displayName: 'Page',
	name: 'pageId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	typeOptions: {
		loadOptionsDependsOn: ['caseId'],
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a page...',
			typeOptions: {
				searchListMethod: 'pageSearch',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. ~123456789',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '(~[0-9]{1,})',
						errorMessage: 'Not a valid Page ID',
					},
				},
			],
		},
	],
};

export const logRLC: INodeProperties = {
	displayName: 'Task Log',
	name: 'logId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a task log...',
			typeOptions: {
				searchListMethod: 'logSearch',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. ~123456789',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '(~[0-9]{1,})',
						errorMessage: 'Not a valid task Log ID',
					},
				},
			],
		},
	],
};

export const commentRLC: INodeProperties = {
	displayName: 'Comment',
	name: 'commentId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a comment...',
			typeOptions: {
				searchListMethod: 'commentSearch',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. ~123456789',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '(~[0-9]{1,})',
						errorMessage: 'Not a valid comment ID',
					},
				},
			],
		},
	],
};

export const observableRLC: INodeProperties = {
	displayName: 'Observable',
	name: 'observableId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select an observable...',
			typeOptions: {
				searchListMethod: 'observableSearch',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. ~123456789',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '(~[0-9]{1,})',
						errorMessage: 'Not a valid Log ID',
					},
				},
			],
		},
	],
};
