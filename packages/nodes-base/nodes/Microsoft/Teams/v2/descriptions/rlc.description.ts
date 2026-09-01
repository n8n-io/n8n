import type { INodeProperties } from 'n8n-workflow';

export const teamRLC: INodeProperties = {
	displayName: 'Team',
	name: 'teamId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description:
		'Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'e.g. My Team',
			typeOptions: {
				searchListMethod: 'getTeams',
				searchable: true,
			},
		},
		{
			displayName: 'From URL',
			name: 'url',
			type: 'string',
			placeholder: 'e.g. https://teams.microsoft.com/l/team/19%3AP8l9gXd6oqlgq…',
			extractValue: {
				type: 'regex',
				regex: 'groupId=([a-f0-9-]+)\\&',
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex: 'https:\\/\\/teams.microsoft.com\\/.*groupId=[a-f0-9-]+\\&.*',
						errorMessage: 'Not a valid Microsoft Teams URL',
					},
				},
			],
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 61165b04-e4cc-4026-b43f-926b4e2a7182',
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
	description:
		'Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)',
	typeOptions: {
		loadOptionsDependsOn: ['teamId.value'],
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Channel...',
			typeOptions: {
				searchListMethod: 'getChannels',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
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
	description:
		'Select the chat from the list, by URL, or by ID (find the chat ID after "conversations/" in the URL)',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Chat...',
			typeOptions: {
				searchListMethod: 'getChats',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
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
	displayName: 'Team',
	name: 'groupId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	typeOptions: {
		loadOptionsDependsOn: ['groupSource'],
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Team...',
			typeOptions: {
				searchListMethod: 'getGroups',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
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
	typeOptions: {
		loadOptionsDependsOn: ['groupId.value'],
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Plan...',
			typeOptions: {
				searchListMethod: 'getPlans',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'rl1HYb0cUEiHPc7zgB_KWWUAA7Of',
			// validation missing because no documentation found how these unique ids look like.
		},
	],
	description: 'The plan for the task to belong to',
};

export const bucketRLC: INodeProperties = {
	displayName: 'Bucket',
	name: 'bucketId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	typeOptions: {
		loadOptionsDependsOn: ['planId.value'],
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Bucket...',
			typeOptions: {
				searchListMethod: 'getBuckets',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
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
	typeOptions: {
		loadOptionsDependsOn: ['groupId.value'],
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a Member...',
			typeOptions: {
				searchListMethod: 'getMembers',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
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

export const meetingRLC: INodeProperties = {
	displayName: 'Meeting',
	name: 'meetingId',
	type: 'resourceLocator',
	default: { mode: 'id', value: '' },
	required: true,
	description: 'The online meeting, by its ID or by its join URL',
	modes: [
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi...',
			hint: 'The ID returned when the meeting was created, not the numeric meeting ID from the invite',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[^\\/\\\\?#%]*',
						errorMessage: "Not a valid meeting ID. To use a join URL, switch to 'By URL'",
					},
				},
			],
		},
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			placeholder: 'e.g. https://teams.microsoft.com/l/meetup-join/19%3ameeting...',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '(\\s*https:\\/\\/.+\\/l\\/meetup-join\\/.+\\s*)?',
						errorMessage:
							"Use the meeting link that contains '/l/meetup-join/', such as the joinWebUrl returned when the meeting was created",
					},
				},
			],
		},
	],
};

/**
 * Org-wide user picker, backed by `getUsers`. Every mode hands the node a plain string that is
 * resolved through `GET /users/{idOrUpn}`, so no mode declares an `extractValue`: an extract
 * regex runs before node code and would reject an email address emitted by an AI agent that
 * cannot know which mode is selected. Spread-and-override for other user fields
 * (`{ ...userRLC, name: 'targetUserId' }`), but note `modes` is shared by reference.
 */
export const userRLC: INodeProperties = {
	displayName: 'User',
	name: 'userId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'Select a user from your organization, by principal name, or by email address',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'e.g. Jane Smith',
			typeOptions: {
				searchListMethod: 'getUsers',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 714c1202-cbac-40ff-9160-53ab5c4df9b8',
			validation: [
				{
					type: 'regex',
					properties: {
						// Any Entra object id, not just v4 GUIDs: this regex hard-blocks
						// literal values at editor level.
						regex:
							'^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})[ \t]*$',
						errorMessage: 'Not a valid Microsoft Entra user ID',
					},
				},
			],
		},
		{
			displayName: 'By Email',
			name: 'email',
			type: 'string',
			placeholder: 'e.g. jane.smith@example.com',
			hint: 'Their email address or their principal name (the address they sign in with). Both work.',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
						errorMessage: 'Not a valid email address',
					},
				},
			],
		},
	],
};
