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
	const qs: IDataObject = {
		$expand: 'members',
	};

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

/**
 * Org-wide user picker on Graph `/v1.0/users`, shared by every Teams field that targets a
 * person. Deliberately generic: no resource/operation reads, no team scoping. Filtering is
 * `$search` (word-prefix, so `unc` will not find `Tuncsik`) and ordering is `$orderby`, both
 * server-side, hence no `filterSortSearchListItems` call unlike its siblings above: filtering
 * again client-side would delete legitimate results and break pagination.
 */
export async function getUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const qs: IDataObject = {
		$select: 'id,displayName,userPrincipalName',
		$top: 100,
		$orderby: 'displayName',
	};

	// Graph rejects the whole $search expression for four characters, so drop them rather than
	// let the picker error: `"` unterminates the quoted term, `\` starts a KQL escape sequence,
	// and `&`/`#` split the query string because Graph re-splits it AFTER percent-decoding (so
	// encoding them is not enough). Verified against a live tenant 2026-09-02. Dropping them
	// degrades to a broader match instead of "Could not load list"; $search is word-prefix
	// anyway, so "Jones & Co" still finds the user by "Jones".
	const term = (filter ?? '').replace(/["\\&#]/g, '').trim();
	if (term) {
		qs.$search = `"displayName:${term}" OR "mail:${term}" OR "userPrincipalName:${term}"`;
	}

	const response = (await microsoftApiRequest.call(
		this,
		'GET',
		'/v1.0/users',
		{},
		// `@odata.nextLink` already carries the query, so a paginated call sends none.
		paginationToken ? {} : qs,
		paginationToken,
		// `$search` on /users is an advanced query and 400s without this header; harmless on
		// the unfiltered first page, so send it always.
		{ ConsistencyLevel: 'eventual' },
	)) as IDataObject;

	// An unexpected shape is not an empty directory: keeping the token would offer "load more"
	// into nothing.
	if (!Array.isArray(response.value)) {
		return { results: [], paginationToken: undefined };
	}

	// Display names are not unique, so the UPN is the disambiguator shown in the picker.
	// Same fallback chain as `resolveMentions`, so a nameless directory object still shows a
	// label rather than a blank row.
	const results: INodeListSearchItems[] = (response.value as IDataObject[]).map((user) => ({
		name: (user.displayName as string) || (user.userPrincipalName as string) || (user.id as string),
		value: user.id as string,
		description: user.userPrincipalName as string,
	}));

	return { results, paginationToken: response['@odata.nextLink'] as string | undefined };
}
