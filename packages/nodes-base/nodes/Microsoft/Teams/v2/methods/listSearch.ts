import {
	NodeOperationError,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeListSearchItems,
	type INodeListSearchResult,
} from 'n8n-workflow';

import { sleep } from '@n8n/utils/sleep';
import { filterSortSearchListItems, tagPermissionError } from '../helpers/utils';
import {
	buildTeamsPath,
	getTeamsCredentialType,
	joinedTeamsEndpoint,
	microsoftApiRequest,
	microsoftApiRequestAllItems,
	SERVICE_PRINCIPAL_AUTH,
} from '../transport';

export async function getChats(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	// App-only Microsoft Graph has no signed-in user, so `/v1.0/chats` (which is
	// `/me`-scoped) cannot be listed. Fail fast with a static message before any
	// request — chat resources are hidden under the Service Principal credential.
	if (getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH) {
		throw new NodeOperationError(
			this.getNode(),
			'Chats are not available with the Service Principal credential',
			{
				description:
					'App-only Microsoft Graph has no signed-in user to read chats for. Use an OAuth2 credential for chat actions.',
			},
		);
	}

	const returnData: INodeListSearchItems[] = [];
	// ponytail: one page of 50 (the endpoint maximum), not full pagination - a user with >50 chats
	// that are mostly 1:1 may still not see every group chat. Upgrade path if that is ever reported:
	// server-side `$filter` on `chatType` if Graph supports it on this endpoint (unverified), else
	// `microsoftApiRequestAllItems`. By-ID mode is the escape hatch meanwhile.
	const qs: IDataObject = {
		$expand: 'members',
		$top: 50,
	};

	// `0` is the FALLBACK value in load-options contexts, not an itemIndex: the Teams
	// trigger shares this picker and has neither parameter, so dropping the fallback
	// makes `getNodeParameter` throw there instead of listing chats.
	const operation = this.getNodeParameter('operation', 0) as string;
	const resource = this.getNodeParameter('resource', 0) as string;
	// Adding a member is impossible on a 1:1 chat; listing its members is legal.
	const excludeOneOnOne = resource === 'chatMember' && ['add'].includes(operation);

	// `/v1.0/chats` occasionally 5xxs transiently; retry up to `maxAttempts` times,
	// sleeping 1s between attempts (not after the last one), and surface the final
	// failure instead of swallowing it as an empty result.
	const maxAttempts = 5;
	let value: IDataObject[] = [];
	let lastError: Error | undefined;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			value = ((await microsoftApiRequest.call(this, 'GET', '/v1.0/chats', {}, qs)) as IDataObject)
				.value as IDataObject[];
			lastError = undefined;
			break;
		} catch (error) {
			lastError = error;
			if (attempt < maxAttempts - 1) {
				await sleep(1000);
			}
		}
	}

	if (lastError) {
		throw new NodeOperationError(this.getNode(), lastError);
	}

	for (const chat of value) {
		if (excludeOneOnOne && chat.chatType === 'oneOnOne') continue;
		if (!chat.topic) {
			chat.topic = (chat.members as IDataObject[])
				.filter((member: IDataObject) => member.displayName)
				.map((member: IDataObject) => member.displayName)
				.join(', ');
		}
		const chatName = `${chat.topic || '(no title) - ' + chat.id} (${chat.chatType})`;
		const chatId = chat.id;
		const url = chat.webUrl as string;
		returnData.push({
			name: chatName,
			value: chatId as string,
			url,
		});
	}

	// Every chat on the page was 1:1, so the dropdown would otherwise show an unexplained
	// empty list for a state no search term can fix.
	if (excludeOneOnOne && value.length > 0 && returnData.length === 0) {
		throw new NodeOperationError(this.getNode(), 'No group chats available to select', {
			description:
				'Only group chats can have members added, because a 1:1 chat has a fixed roster. This list covers up to 50 chats, so if your group chat is not among them, switch the Chat field to "By ID".',
		});
	}

	const results = returnData
		.filter(
			(item) =>
				!filter ||
				item.name.toLowerCase().includes(filter.toLowerCase()) ||
				item.value.toString().toLowerCase().includes(filter.toLowerCase()),
		)
		.sort((a, b) => {
			if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
				return -1;
			}
			if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
				return 1;
			}
			return 0;
		});

	return { results };
}

export async function getUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// ConsistencyLevel is sent on every call: directory paging drops custom headers on
	// nextLink requests, so the token branch needs it too or Graph rejects the $search.
	const headers: IDataObject = { ConsistencyLevel: 'eventual' };
	let response: IDataObject;
	if (paginationToken) {
		response = (await microsoftApiRequest.call(
			this,
			'GET',
			'',
			{},
			{},
			paginationToken,
			headers,
		)) as IDataObject;
	} else {
		const qs: IDataObject = { $select: 'id,displayName,userPrincipalName' };
		// Two different problems. `"` and `\` only need escaping inside the quoted term, so
		// escape them (backslash first, then quote) and keep the term intact. `&` and `#`
		// cannot be escaped or encoded away: Graph re-splits the query string AFTER
		// percent-decoding, so they truncate the expression and 400 the whole call (verified on
		// a live tenant). Those two are dropped, which just widens the match. `mail` is searched
		// as well, because a guest's mail differs from their principal name and the mail is the
		// address people actually know.
		// The emptiness check is on the stripped term, not the raw filter: a filter of only
		// unusable characters would otherwise send an empty term, which Graph rejects.
		const escaped = (filter ?? '')
			.replace(/[&#]/g, '')
			.replaceAll('\\', '\\\\')
			.replaceAll('"', '\\"')
			.trim();
		if (escaped) {
			qs.$search = `"displayName:${escaped}" OR "mail:${escaped}" OR "userPrincipalName:${escaped}"`;
		}
		response = (await microsoftApiRequest.call(
			this,
			'GET',
			'/v1.0/users',
			{},
			qs,
			undefined,
			headers,
		)) as IDataObject;
	}

	// An unexpected shape is not an empty directory: returning the token as well would offer
	// "load more" into nothing.
	if (!Array.isArray(response.value)) {
		return { results: [], paginationToken: undefined };
	}

	const returnData: INodeListSearchItems[] = (response.value as IDataObject[]).map((user) => ({
		name: `${user.displayName} (${user.userPrincipalName})`,
		value: user.id as string,
	}));

	// No filter argument: `$search` already filtered server-side across the whole
	// collection, so this only applies the sort every sibling picker uses.
	return {
		results: filterSortSearchListItems(returnData),
		paginationToken: response['@odata.nextLink'] as string | undefined,
	};
}

export async function getTeams(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const returnData: INodeListSearchItems[] = [];
	// `/v1.0/teams` (SP) and `/v1.0/me/joinedTeams` (OAuth2) are both Graph-paginated
	// collections — page through `@odata.nextLink` so all org teams are returned, not
	// just the first ~100. `microsoftApiRequestAllItems` returns the flattened `value`.
	const value = await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		joinedTeamsEndpoint.call(this),
	);

	for (const team of value) {
		const teamName = team.displayName;
		const teamId = team.id;
		// let channelId: string = '';

		// try {
		// 	const channels = await microsoftApiRequestAllItems.call(
		// 		this,
		// 		'value',
		// 		'GET',
		// 		`/v1.0/teams/${teamId}/channels`,
		// 		{},
		// 	);

		// 	if (channels.length > 0) {
		// 		channelId = channels.find((channel: IDataObject) => channel.displayName === 'General').id;
		// 		if (!channelId) {
		// 			channelId = channels[0].id;
		// 		}
		// 	}
		// } catch (error) {}

		returnData.push({
			name: teamName,
			value: teamId,
			// url: channelId
			// 	? `https://teams.microsoft.com/l/team/${channelId}/conversations?groupId=${teamId}&tenantId=${team.tenantId}`
			// 	: undefined,
		});
	}
	const results = filterSortSearchListItems(returnData, filter);

	return { results };
}

export async function getChannels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const returnData: INodeListSearchItems[] = [];
	const teamId = this.getCurrentNodeParameter('teamId', { extractValue: true }) as string;
	const operation = this.getNodeParameter('operation', 0) as string;
	const resource = this.getNodeParameter('resource', 0) as string;

	const excludeGeneralChannel = ['deleteChannel'];

	if (resource === 'channel') excludeGeneralChannel.push('update');

	const { value } = await microsoftApiRequest.call(
		this,
		'GET',
		buildTeamsPath.call(this, ['/v1.0/teams/', { id: teamId }, '/channels']),
	);

	for (const channel of value) {
		if (channel.displayName === 'General' && excludeGeneralChannel.includes(operation)) {
			continue;
		}
		const channelName = channel.displayName;
		const channelId = channel.id;
		const url = channel.webUrl;
		returnData.push({
			name: channelName,
			value: channelId,
			url,
		});
	}

	const results = filterSortSearchListItems(returnData, filter);
	return { results };
}

/**
 * Team tags for the mention picker. Mirrors `getChannels` (team-scoped, client-side filtering)
 * rather than `getUsers`: Graph documents no `$search` on `/tags`, and `$filter` cannot do the
 * substring match a picker needs. `/v1.0`, the tags collection is GA.
 */
export async function getTags(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const teamId = this.getCurrentNodeParameter('teamId', { extractValue: true }) as string;
	// Deliberate divergence from `getChannels`, which has no such guard and lets `buildTeamsPath`
	// emit the generic "A required ID is empty" on the same node.
	if (!teamId) {
		throw new NodeOperationError(this.getNode(), 'Select a team first');
	}

	let value: IDataObject[];
	try {
		value = await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			buildTeamsPath.call(this, ['/v1.0/teams/', { id: teamId }, '/tags']),
		);
	} catch (error) {
		// The action belongs in the message, not the description: the resource-locator dropdown
		// renders only the message and drops the description, so guidance put there is invisible.
		// Verified in the editor against a credential without the scope, 2026-09-10.
		throw (
			tagPermissionError(
				error,
				this.getNode(),
				'Could not load team tags. Add TeamworkTag.Read to the credential, then reconnect it.',
			) ?? error
		);
	}

	// Graph sends `memberCount` as a number when listing and as a string when getting one tag.
	const memberCounts = new Map(value.map((tag) => [tag.id as string, Number(tag.memberCount)]));
	const returnData: INodeListSearchItems[] = value.map((tag) => ({
		// Falls back like `getUsers`: a tag with no display name would otherwise set `name` to
		// `undefined` and throw in the comparator below instead of listing the tags.
		name: (tag.displayName as string) || (tag.id as string),
		value: tag.id as string,
		description: tag.description as string,
	}));

	// Filter and sort on the bare display name, then append the count. A tag notifies everyone
	// carrying it and the dropdown renders only `name`, so the blast radius has to go in the
	// label, but baking it in first makes every tag match any substring of "(4 members)".
	const results = filterSortSearchListItems(returnData, filter).map((tag) => {
		const memberCount = memberCounts.get(tag.value as string);
		return memberCount !== undefined && Number.isFinite(memberCount)
			? {
					...tag,
					name: `${tag.name} (${memberCount} ${memberCount === 1 ? 'member' : 'members'})`,
				}
			: tag;
	});

	return { results };
}

export async function getGroups(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const returnData: INodeListSearchItems[] = [];
	const value = await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		joinedTeamsEndpoint.call(this),
	);

	for (const team of value) {
		returnData.push({
			name: team.displayName,
			value: team.id,
		});
	}

	const results = filterSortSearchListItems(returnData, filter);
	return { results };
}

export async function getPlans(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const returnData: INodeListSearchItems[] = [];

	let groupId = '';

	try {
		groupId = this.getCurrentNodeParameter('groupId', { extractValue: true }) as string;
	} catch (error) {}

	const operation = this.getNodeParameter('operation', 0) as string;

	if (operation === 'update' && !groupId) {
		groupId = this.getCurrentNodeParameter('updateFields.groupId', {
			extractValue: true,
		}) as string;
	}

	const { value } = await microsoftApiRequest.call(
		this,
		'GET',
		buildTeamsPath.call(this, ['/v1.0/groups/', { id: groupId }, '/planner/plans']),
	);
	for (const plan of value) {
		returnData.push({
			name: plan.title,
			value: plan.id,
		});
	}
	const results = filterSortSearchListItems(returnData, filter);
	return { results };
}

export async function getBuckets(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const returnData: INodeListSearchItems[] = [];
	let planId = '';

	try {
		planId = this.getCurrentNodeParameter('planId', { extractValue: true }) as string;
	} catch (error) {}

	const operation = this.getNodeParameter('operation', 0) as string;

	if (operation === 'update' && !planId) {
		planId = this.getCurrentNodeParameter('updateFields.planId', {
			extractValue: true,
		}) as string;
	}

	const { value } = await microsoftApiRequest.call(
		this,
		'GET',
		buildTeamsPath.call(this, ['/v1.0/planner/plans/', { id: planId }, '/buckets']),
	);
	for (const bucket of value) {
		returnData.push({
			name: bucket.name,
			value: bucket.id,
		});
	}
	const results = filterSortSearchListItems(returnData, filter);
	return { results };
}

export async function getMembers(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const returnData: INodeListSearchItems[] = [];
	let groupId = '';

	try {
		groupId = this.getCurrentNodeParameter('groupId', { extractValue: true }) as string;
	} catch (error) {}

	const operation = this.getNodeParameter('operation', 0) as string;

	if (operation === 'update' && !groupId) {
		groupId = this.getCurrentNodeParameter('updateFields.groupId', {
			extractValue: true,
		}) as string;
	}
	const { value } = await microsoftApiRequest.call(
		this,
		'GET',
		buildTeamsPath.call(this, ['/v1.0/groups/', { id: groupId }, '/members']),
	);

	for (const member of value) {
		returnData.push({
			name: member.displayName,
			value: member.id,
		});
	}

	const results = filterSortSearchListItems(returnData, filter);
	return { results };
}
