import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Chat Type',
		name: 'chatType',
		required: true,
		type: 'options',
		options: [
			{
				name: 'One on One',
				value: 'oneOnOne',
				description: 'A chat between two people',
			},
			{
				name: 'Group',
				value: 'group',
				description: 'A group chat with multiple participants',
			},
		],
		default: 'oneOnOne',
		description: 'The type of chat to create',
	},
	{
		displayName: 'Members',
		name: 'members',
		placeholder: 'Add Member',
		required: true,
		type: 'fixedCollection',
		default: { membersList: [] },
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				name: 'membersList',
				displayName: 'Members',
				values: [
					{
						displayName: 'User ID',
						name: 'userId',
						type: 'string',
						required: true,
						default: '',
						description: 'The user ID or email address of the participant',
						placeholder: 'e.g. user@domain.com or 8b081ef6-4792-4def-b2c9-c363a1bf41d5',
					},
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						options: [
							{
								name: 'Owner',
								value: 'owner',
							},
							{
								name: 'Guest',
								value: 'guest',
							},
						],
						default: 'owner',
						description: 'The role of the member in the chat',
					},
				],
			},
		],
		description: 'List of members to add to the chat. At least 2 members are required.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add option',
		displayOptions: {
			show: {
				chatType: ['group'],
			},
		},
		options: [
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				default: '',
				description: 'The title of the group chat (only available for group chats)',
				placeholder: 'e.g. Project Discussion',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['chat'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/chat-post?view=graph-rest-1.0&tabs=http
	const chatType = this.getNodeParameter('chatType', i) as string;
	const members = this.getNodeParameter('members.membersList', i, []) as Array<{
		userId: string;
		role: string;
	}>;
	const options = this.getNodeParameter('options', i, {});

	// Validate members count
	if (members.length < 2) {
		throw new Error('At least 2 members are required to create a chat');
	}

	// For oneOnOne chats, exactly 2 members are required
	if (chatType === 'oneOnOne' && members.length !== 2) {
		throw new Error('One-on-one chats must have exactly 2 members');
	}

	// Build the request body
	const body: IDataObject = {
		chatType,
		members: members.map((member) => {
			const userBinding = member.userId.includes('@')
				? `https://graph.microsoft.com/v1.0/users('${member.userId}')`
				: `https://graph.microsoft.com/v1.0/users('${member.userId}')`;

			return {
				'@odata.type': '#microsoft.graph.aadUserConversationMember',
				roles: [member.role],
				'user@odata.bind': userBinding,
			};
		}),
	};

	// Add topic for group chats
	if (chatType === 'group' && options.topic) {
		body.topic = options.topic as string;
	}

	return await microsoftApiRequest.call(this, 'POST', '/v1.0/chats', body);
}
