import {
	NodeOperationError,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeListSearchItems,
	type INodeListSearchResult,
} from 'n8n-workflow';

import { sleep } from '@n8n/utils/sleep';
import { filterSortSearchListItems } from '../helpers/utils';
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
	// empty list for a state no search term can fix. Only one page is fetched, so the
	// message states what this list holds and never that the account has no group chats.
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
		if (filter) {
			// `$search` escaping is NOT `$filter`'s quote-doubling: backslash-escape `\`
			// first, then `"`, and the OR operator is uppercase and outside the quotes.
			const escaped = filter.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
			qs.$search = `"displayName:${escaped}" OR "userPrincipalName:${escaped}"`;
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
