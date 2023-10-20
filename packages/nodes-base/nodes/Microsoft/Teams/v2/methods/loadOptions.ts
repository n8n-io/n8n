import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { microsoftApiRequest } from '../transport';

// Get all the team's channels to display them to user so that they can
// select them easily
export async function getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const teamId = this.getCurrentNodeParameter('teamId') as string;
	const { value } = await microsoftApiRequest.call(this, 'GET', `/v1.0/teams/${teamId}/channels`);
	for (const channel of value) {
		const channelName = channel.displayName;
		const channelId = channel.id;
		returnData.push({
			name: channelName,
			value: channelId,
		});
	}
	return returnData;
}

// Get all the teams to display them to user so that they can
// select them easily
export async function getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const { value } = await microsoftApiRequest.call(this, 'GET', '/v1.0/me/joinedTeams');
	for (const team of value) {
		const teamName = team.displayName;
		const teamId = team.id;
		returnData.push({
			name: teamName,
			value: teamId,
		});
	}
	return returnData;
}

// Get all the groups to display them to user so that they can
// select them easily
export async function getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
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
	return returnData;
}

// Get all the plans to display them to user so that they can
// select them easily
export async function getPlans(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	let groupId = this.getCurrentNodeParameter('groupId') as string;
	const operation = this.getNodeParameter('operation', 0);
	if (operation === 'update' && (groupId === undefined || groupId === null)) {
		// groupId not found at base, check updateFields for the groupId
		groupId = this.getCurrentNodeParameter('updateFields.groupId') as string;
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
	return returnData;
}

// Get all the plans to display them to user so that they can
// select them easily
export async function getBuckets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	let planId = this.getCurrentNodeParameter('planId') as string;
	const operation = this.getNodeParameter('operation', 0);
	if (operation === 'update' && (planId === undefined || planId === null)) {
		// planId not found at base, check updateFields for the planId
		planId = this.getCurrentNodeParameter('updateFields.planId') as string;
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
	return returnData;
}

// Get all the plans to display them to user so that they can
// select them easily
export async function getMembers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	let groupId = this.getCurrentNodeParameter('groupId') as string;
	const operation = this.getNodeParameter('operation', 0);
	if (operation === 'update' && (groupId === undefined || groupId === null)) {
		// groupId not found at base, check updateFields for the groupId
		groupId = this.getCurrentNodeParameter('updateFields.groupId') as string;
	}
	const { value } = await microsoftApiRequest.call(this, 'GET', `/v1.0/groups/${groupId}/members`);
	for (const member of value) {
		returnData.push({
			name: member.displayName,
			value: member.id,
		});
	}
	return returnData;
}

// Get all the labels to display them to user so that they can
// select them easily
export async function getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	let planId = this.getCurrentNodeParameter('planId') as string;
	const operation = this.getNodeParameter('operation', 0);
	if (operation === 'update' && (planId === undefined || planId === null)) {
		// planId not found at base, check updateFields for the planId
		planId = this.getCurrentNodeParameter('updateFields.planId') as string;
	}
	const { categoryDescriptions } = await microsoftApiRequest.call(
		this,
		'GET',
		`/v1.0/planner/plans/${planId}/details`,
	);
	for (const key of Object.keys(categoryDescriptions as IDataObject)) {
		if (categoryDescriptions[key] !== null) {
			returnData.push({
				name: categoryDescriptions[key],
				value: key,
			});
		}
	}
	return returnData;
}

// Get all the chats to display them to user so that they can
// select them easily
export async function getChats(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
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
		const chatName = `${chat.topic || '(no title) - ' + (chat.id as string)} (${chat.chatType})`;
		const chatId = chat.id;
		returnData.push({
			name: chatName,
			value: chatId,
		});
	}
	return returnData;
}
