import { guidIdMode, idMode, listMode, makeRLC } from './rlc.builder';

export const teamRLC = makeRLC({
	displayName: 'Team',
	name: 'teamId',
	required: true,
	description:
		'Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")',
	modes: [
		listMode('getTeams', 'e.g. My Team'),
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
		guidIdMode('e.g. 61165b04-e4cc-4026-b43f-926b4e2a7182'),
	],
});

export const channelRLC = makeRLC({
	displayName: 'Channel',
	name: 'channelId',
	required: true,
	description:
		'Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)',
	dependsOn: ['teamId.value'],
	modes: [
		listMode('getChannels', 'Select a Channel...'),
		// validation missing because no documentation found how these unique ids look like.
		idMode({ placeholder: '19:-xlxyqXNSCxpI1SDzgQ_L9ZvzSR26pgphq1BJ9y7QJE1@thread.tacv2' }),
	],
});

export const chatRLC = makeRLC({
	displayName: 'Chat',
	name: 'chatId',
	required: true,
	description:
		'Select the chat from the list, by URL, or by ID (find the chat ID after "conversations/" in the URL)',
	modes: [
		listMode('getChats', 'Select a Chat...'),
		// validation missing because no documentation found how these unique chat ids look like.
		idMode({
			placeholder:
				'19:7e2f1174-e8ee-4859-b8b1-a8d1cc63d276_0c5cfdbb-596f-4d39-b557-5d9516c94107@unq.gbl.spaces',
			url: '=https://teams.microsoft.com/l/chat/{{encodeURIComponent($value)}}/0',
		}),
	],
});

export const groupRLC = makeRLC({
	displayName: 'Team',
	name: 'groupId',
	required: true,
	dependsOn: ['groupSource'],
	modes: [
		listMode('getGroups', 'Select a Team...'),
		guidIdMode('12f0ca7d-b77f-4c4e-93d2-5cbdb4f464c6'),
	],
});

export const planRLC = makeRLC({
	displayName: 'Plan',
	name: 'planId',
	required: true,
	dependsOn: ['groupId.value'],
	modes: [
		listMode('getPlans', 'Select a Plan...'),
		// validation missing because no documentation found how these unique ids look like.
		idMode({ placeholder: 'rl1HYb0cUEiHPc7zgB_KWWUAA7Of' }),
	],
	description: 'The plan for the task to belong to',
});

export const bucketRLC = makeRLC({
	displayName: 'Bucket',
	name: 'bucketId',
	required: true,
	dependsOn: ['planId.value'],
	modes: [
		listMode('getBuckets', 'Select a Bucket...'),
		// validation missing because no documentation found how these unique ids look like.
		idMode({ placeholder: 'rl1HYb0cUEiHPc7zgB_KWWUAA7Of' }),
	],
	description: 'The bucket for the task to belong to',
});

export const memberRLC = makeRLC({
	displayName: 'Member',
	name: 'memberId',
	dependsOn: ['groupId.value'],
	modes: [
		listMode('getMembers', 'Select a Member...'),
		guidIdMode('7e2f1174-e8ee-4859-b8b1-a8d1cc63d276'),
	],
});

export const meetingRLC = makeRLC({
	displayName: 'Meeting',
	name: 'meetingId',
	required: true,
	description: 'The online meeting, by its ID or by its join URL',
	modes: [
		// By ID first: the first mode is the default mode.
		idMode({
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
		}),
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
});

export const userRLC = makeRLC({
	displayName: 'User',
	name: 'userId',
	required: true,
	description:
		'Select the user from the list or by ID. Guest users must be given by their object ID, not by their user principal name.',
	modes: [
		listMode('getUsers', 'Select a User...'),
		idMode({
			placeholder: 'e.g. jacob@contoso.com',
			// `validation` only, never an `extractValue`: a GUID-only extractor makes core
			// reject any expression that resolves to a user principal name before the node
			// runs, and Graph binds a principal name directly.
			validation: [
				{
					type: 'regex',
					properties: {
						regex:
							'^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|[^\\s@#]+@[^\\s@#]+)[ \t]*$',
						errorMessage:
							'Not a valid user ID or user principal name. Give a guest user by their object ID, because a guest principal name contains "#EXT#".',
					},
				},
			],
		}),
	],
});

/**
 * Team tag picker, scoped to the node's `teamId` and backed by `getTags`. Like `userRLC`, no mode
 * declares an `extractValue`: the row read that consumes it cannot pass `{ extractValue: true }`,
 * because a row-level `displayOptions` makes that read throw.
 */
export const teamworkTagRLC = makeRLC({
	displayName: 'Team Tag',
	name: 'tagId',
	required: true,
	description: 'Select a tag from the team, or enter its ID',
	dependsOn: ['teamId.value'],
	modes: [
		listMode('getTags', 'e.g. Engineering'),
		idMode({
			hint: 'The base64 tag ID from the Microsoft Graph tags endpoint',
			validation: [
				{
					type: 'regex',
					properties: {
						// A tag ID is base64 of `{groupId}##{tagGuid}##{token}`. base64 emits `+` or
						// `/` only for a plaintext byte of `>`, `~`, `?`, DEL or non-ASCII, and hex,
						// `-`, `#` and alphanumerics contain none of those, so only `[A-Za-z0-9]`
						// and `=` padding can occur. No length check: a GUID-shaped token gives 152
						// characters (pinned in `v2/test/methods/getUsers.test.ts`), but nothing
						// documents the token as a GUID, so both that length and the alphabet above
						// rest on the assumed token shape. If Microsoft widens it, a From List pick
						// bypasses this regex and dies at `buildTeamsPath` with "remove any slashes"
						// for a tag the user chose from a dropdown.
						regex: '^[A-Za-z0-9=]+[ \t]*$',
						errorMessage: 'Not a valid Microsoft Teams tag ID',
					},
				},
			],
		}),
	],
});

export const chatMemberRLC = makeRLC({
	displayName: 'Member',
	name: 'membershipId',
	required: true,
	description:
		'Select the member from the list, or give the membership ID returned by Chat Member → Get Many (the ID field, not the "userId" field)',
	dependsOn: ['chatId.value'],
	modes: [
		listMode('getChatMembers', 'Select a Member...'),
		// validation missing because Microsoft documents no shape for membership ids.
		idMode({ placeholder: 'e.g. MCMjMCMjMjM3ODZjYTYtN2ZmMi00NjcyLTg3ZDAtNWM2NDll...' }),
	],
});
