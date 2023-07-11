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
			placeholder: 'Select a file...',
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
			placeholder: 'Select a file...',
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
