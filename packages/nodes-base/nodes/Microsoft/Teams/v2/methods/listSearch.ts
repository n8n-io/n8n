import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { microsoftApiRequest } from '../transport';
import { filterSortSearchListItems } from '../helpers/utils';

export async function getChats(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const returnData: INodeListSearchItems[] = [];
	const qs: IDataObject = {
		$expand: 'members',
	};
	const { value } = await microsoftApiRequest.call(this, 'GET', '/v1.0/chats', {}, qs);
	for (const chat of value) {
		if (!chat.topic) {
			chat.topic = chat.members
				.filter((member: IDataObject) => member.displayName)
				.map((member: IDataObject) => member.displayName)
				.join(', ');
		}
		const chatName = `${chat.topic || '(no title) - ' + chat.id} (${chat.chatType})`;
		const chatId = chat.id;
		const url = chat.webUrl;
		returnData.push({
			name: chatName,
			value: chatId,
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
	const { value } = await microsoftApiRequest.call(this, 'GET', '/v1.0/me/joinedTeams');
	for (const team of value) {
		const teamName = team.displayName;
		const teamId = team.id;
		returnData.push({
			name: teamName,
			value: teamId,
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
	const { value } = await microsoftApiRequest.call(this, 'GET', `/v1.0/teams/${teamId}/channels`);
	for (const channel of value) {
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
	const groupSource = this.getCurrentNodeParameter('groupSource') as string;
	let requestUrl = '/v1.0/groups' as string;
	if (groupSource === 'mine') {
		requestUrl = '/v1.0/me/transitiveMemberOf';
	}
	const { value } = await microsoftApiRequest.call(this, 'GET', requestUrl);
	for (const group of value) {
		returnData.push({
			name: group.displayName || group.mail || group.id,
			value: group.id,
			description: group.mail,
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
	let groupId = this.getCurrentNodeParameter('groupId', { extractValue: true }) as string;
	const operation = this.getNodeParameter('operation', 0) as string;
	if (operation === 'update' && (groupId === undefined || groupId === null)) {
		// groupId not found at base, check updateFields for the groupId
		groupId = this.getCurrentNodeParameter('updateFields.groupId', {
			extractValue: true,
		}) as string;
	}
	const { value } = await microsoftApiRequest.call(
		this,
		'GET',
		`/v1.0/groups/${groupId}/planner/plans`,
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
	let planId = this.getCurrentNodeParameter('planId', { extractValue: true }) as string;
	const operation = this.getNodeParameter('operation', 0) as string;
	if (operation === 'update' && (planId === undefined || planId === null)) {
		// planId not found at base, check updateFields for the planId
		planId = this.getCurrentNodeParameter('updateFields.planId', {
			extractValue: true,
		}) as string;
	}
	const { value } = await microsoftApiRequest.call(
		this,
		'GET',
		`/v1.0/planner/plans/${planId}/buckets`,
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
	let groupId = this.getCurrentNodeParameter('groupId', { extractValue: true }) as string;
	const operation = this.getNodeParameter('operation', 0) as string;
	if (operation === 'update' && (groupId === undefined || groupId === null)) {
		// groupId not found at base, check updateFields for the groupId
		groupId = this.getCurrentNodeParameter('updateFields.groupId', {
			extractValue: true,
		}) as string;
	}
	const { value } = await microsoftApiRequest.call(this, 'GET', `/v1.0/groups/${groupId}/members`);
	for (const member of value) {
		returnData.push({
			name: member.displayName,
			value: member.id,
		});
	}
	const results = filterSortSearchListItems(returnData, filter);
	return { results };
}
