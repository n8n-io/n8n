import type { INodeProperties } from 'n8n-workflow';

export const teamRLC: INodeProperties = {
	displayName: 'Team',
	name: 'teamId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'Team',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Team...',
			typeOptions: {
				searchListMethod: 'getTeams',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'b16cb45e-df51-4ff6-a044-dd90bf2bfdb2',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})[ \t]*',
						errorMessage: 'Not a valid Microsoft Teams Team ID',
					},
				},
			],
			extractValue: {
				type: 'regex',
				regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})',
			},
		},
	],
};

export const channelRLC: INodeProperties = {
	displayName: 'Channel',
	name: 'channelId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	// typeOptions: {
	// 	loadOptionsDependsOn: ['teamId.value'],
	// },
	modes: [
		{
			displayName: 'Channel',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Channel...',
			typeOptions: {
				searchListMethod: 'getChannels',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: '19:-xlxyqXNSCxpI1SDzgQ_L9ZvzSR26pgphq1BJ9y7QJE1@thread.tacv2',
			// validation missing because no documentation found how these unique ids look like.
		},
	],
};

export const chatRLC: INodeProperties = {
	displayName: 'Chat',
	name: 'chatId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'Chat',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Chat...',
			typeOptions: {
				searchListMethod: 'getChats',
				searchable: true,
			},
		},
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			placeholder:
				'https://teams.microsoft.com/_#/conversations/19:7e2f1174-e8ee-4859-b8b1-a8d1cc63d276_0c5cfdbb-596f-4d39-b557-5d9516c94107@unq.gbl.spaces?ctx=chat',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: 'https://teams.microsoft.com/_#/conversations/([^\\s?]+)\\?ctx=chat[ \t]*',
						errorMessage: 'Not a valid Microsoft Teams URL',
					},
				},
			],
			extractValue: {
				type: 'regex',
				regex: 'https://teams.microsoft.com/_#/conversations/([^\\s?]+)',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder:
				'19:7e2f1174-e8ee-4859-b8b1-a8d1cc63d276_0c5cfdbb-596f-4d39-b557-5d9516c94107@unq.gbl.spaces',
			// validation missing because no documentation found how these unique chat ids look like.
			url: '=https://teams.microsoft.com/l/chat/{{encodeURIComponent($value)}}/0',
		},
	],
};

export const groupRLC: INodeProperties = {
	displayName: 'Group',
	name: 'groupId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'Group',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Group...',
			typeOptions: {
				searchListMethod: 'getGroups',
				// missing searchListDependsOn: ['groupSource'],
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: '12f0ca7d-b77f-4c4e-93d2-5cbdb4f464c6',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})[ \t]*',
						errorMessage: 'Not a valid Microsoft Teams Team ID',
					},
				},
			],
			extractValue: {
				type: 'regex',
				regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})',
			},
		},
	],
};

export const planRLC: INodeProperties = {
	displayName: 'Plan',
	name: 'planId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'Plan',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Plan...',
			typeOptions: {
				searchListMethod: 'getPlans',
				// missing searchListDependsOn: ['groupId'],
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'rl1HYb0cUEiHPc7zgB_KWWUAA7Of',
			// validation missing because no documentation found how these unique ids look like.
		},
	],
	displayOptions: {
		show: {
			operation: ['create'],
			resource: ['task'],
		},
	},
	description: 'The plan for the task to belong to',
};

export const bucketRLC: INodeProperties = {
	displayName: 'Bucket Name',
	name: 'bucketId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'Bucket',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Bucket...',
			typeOptions: {
				searchListMethod: 'getBuckets',
				// missing searchListDependsOn: ['planId'],
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'rl1HYb0cUEiHPc7zgB_KWWUAA7Of',
			// validation missing because no documentation found how these unique ids look like.
		},
	],
	description: 'The bucket for the task to belong to',
};

export const memberRLC: INodeProperties = {
	displayName: 'Member',
	name: 'memberId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'Member',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Member...',
			typeOptions: {
				searchListMethod: 'getMembers',
				// missing searchListDependsOn: ['groupId'],
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: '7e2f1174-e8ee-4859-b8b1-a8d1cc63d276',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})[ \t]*',
						errorMessage: 'Not a valid Microsoft Teams Team ID',
					},
				},
			],
			extractValue: {
				type: 'regex',
				regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})',
			},
		},
	],
};
