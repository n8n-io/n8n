import type { INodeProperties } from 'n8n-workflow';

export const groupSourceOptions: INodeProperties = {
	displayName: 'Group Source',
	name: 'groupSource',
	required: true,
	type: 'options',
	default: 'all',
	options: [
		{
			name: 'All Groups',
			value: 'all',
			description: 'From all groups',
		},
		{
			name: 'My Groups',
			value: 'mine',
			description: 'Only load groups that account is member of',
		},
	],
};
