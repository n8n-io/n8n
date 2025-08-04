import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodePropertyOptions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { JiraServerInfo, JiraWebhook } from './types';

export async function jiraSoftwareCloudApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	endpoint: string,
	method: IHttpRequestMethods,
	body: any = {},
	query?: IDataObject,
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const jiraVersion = this.getNodeParameter('jiraVersion', 0) as string;

	let domain = '';
	let credentialType: string;

	if (jiraVersion === 'server') {
		domain = (await this.getCredentials('jiraSoftwareServerApi')).domain as string;
		credentialType = 'jiraSoftwareServerApi';
	} else if (jiraVersion === 'serverPat') {
		domain = (await this.getCredentials('jiraSoftwareServerPatApi')).domain as string;
		credentialType = 'jiraSoftwareServerPatApi';
	} else {
		domain = (await this.getCredentials('jiraSoftwareCloudApi')).domain as string;
		credentialType = 'jiraSoftwareCloudApi';
	}

	const options: IRequestOptions = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'X-Atlassian-Token': 'no-check',
		},
		method,
		qs: query,
		uri: uri || `${domain}/rest${endpoint}`,
		body,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	if (Object.keys(body as IDataObject).length === 0) {
		delete options.body;
	}

	if (Object.keys(query || {}).length === 0) {
		delete options.qs;
	}
	try {
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		if (error.description?.includes?.("Field 'priority' cannot be set")) {
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message:
					"Field 'priority' cannot be set. You need to add the Priority field to your Jira Project's Issue Types.",
			});
		}
		throw error;
	}
}

export function handlePagination(
	body: any,
	query: IDataObject,
	paginationType: 'offset' | 'token',
	responseData?: any,
): boolean {
	if (!responseData) {
		if (paginationType === 'offset') {
			query.startAt = 0;
			query.maxResults = 100;
		} else {
			body.maxResults = 100;
		}

		return true;
	}

	if (paginationType === 'offset') {
		const nextStartAt = (responseData.startAt as number) + (responseData.maxResults as number);
		query.startAt = nextStartAt;
		return nextStartAt < responseData.total;
	} else {
		body.nextPageToken = responseData.nextPageToken as string;
		return !!responseData.nextPageToken;
	}
}

export async function jiraSoftwareCloudApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	endpoint: string,
	method: IHttpRequestMethods,
	body: any = {},
	query: IDataObject = {},
	paginationType: 'offset' | 'token' = 'offset',
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let hasNextPage = handlePagination(body, query, paginationType);
	do {
		responseData = await jiraSoftwareCloudApiRequest.call(this, endpoint, method, body, query);
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		hasNextPage = handlePagination(body, query, paginationType, responseData);
	} while (hasNextPage);

	return returnData;
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = '';
	}
	return result;
}

export function eventExists(currentEvents: string[], webhookEvents: string[]) {
	for (const currentEvent of currentEvents) {
		if (!webhookEvents.includes(currentEvent)) {
			return false;
		}
	}
	return true;
}

export function getWebhookId(webhook: JiraWebhook) {
	if (webhook.id) return webhook.id.toString();
	return webhook.self?.split('/').pop();
}

export function simplifyIssueOutput(responseData: {
	names: { [key: string]: string };
	fields: IDataObject;
	id: string;
	key: string;
	self: string;
}) {
	const mappedFields: IDataObject = {
		id: responseData.id,
		key: responseData.key,
		self: responseData.self,
	};
	// Sort custom fields last so we map them last
	const customField = /^customfield_\d+$/;
	const sortedFields: string[] = Object.keys(responseData.fields).sort((a, b) => {
		if (customField.test(a) && customField.test(b)) {
			return a > b ? 1 : -1;
		}
		if (customField.test(a)) {
			return 1;
		}
		if (customField.test(b)) {
			return -1;
		}
		return a > b ? 1 : -1;
	});
	for (const field of sortedFields) {
		if (responseData.names[field] in mappedFields) {
			let newField: string = responseData.names[field];
			let counter = 0;
			while (newField in mappedFields) {
				counter++;
				newField = `${responseData.names[field]}_${counter}`;
			}
			mappedFields[newField] = responseData.fields[field];
		} else {
			mappedFields[responseData.names[field] || field] = responseData.fields[field];
		}
	}

	return mappedFields;
}

export const allEvents = [
	'board_created',
	'board_updated',
	'board_deleted',
	'board_configuration_changed',
	'comment_created',
	'comment_updated',
	'comment_deleted',
	'jira:issue_created',
	'jira:issue_updated',
	'jira:issue_deleted',
	'option_voting_changed',
	'option_watching_changed',
	'option_unassigned_issues_changed',
	'option_subtasks_changed',
	'option_attachments_changed',
	'option_issuelinks_changed',
	'option_timetracking_changed',
	'project_created',
	'project_updated',
	'project_deleted',
	'sprint_created',
	'sprint_deleted',
	'sprint_updated',
	'sprint_started',
	'sprint_closed',
	'user_created',
	'user_updated',
	'user_deleted',
	'jira:version_released',
	'jira:version_unreleased',
	'jira:version_created',
	'jira:version_moved',
	'jira:version_updated',
	'jira:version_deleted',
	'issuelink_created',
	'issuelink_deleted',
	'worklog_created',
	'worklog_updated',
	'worklog_deleted',
];

export function filterSortSearchListItems(items: INodeListSearchItems[], filter?: string) {
	return items
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
}

export async function getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const jiraVersion = this.getCurrentNodeParameter('jiraVersion') as string;
	const maxResults = 1000;
	const query: IDataObject = { maxResults };
	let endpoint = '/api/2/users/search';

	if (jiraVersion === 'server' || jiraVersion === 'serverPat') {
		endpoint = '/api/2/user/search';
		query.username = "'";
	}

	const users = [];
	let hasNextPage: boolean;

	do {
		const usersPage = (await jiraSoftwareCloudApiRequest.call(
			this,
			endpoint,
			'GET',
			{},
			{ ...query, startAt: users.length },
		)) as IDataObject[];
		users.push(...usersPage);
		hasNextPage = usersPage.length === maxResults;
	} while (hasNextPage);

	return users
		.filter((user) => user.active)
		.map((user) => ({
			name: user.displayName as string,
			value: (user.accountId ?? user.name) as string,
		}))
		.sort((a: INodePropertyOptions, b: INodePropertyOptions) => {
			return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
		});
}

export async function getServerInfo(this: IHookFunctions) {
	return await (jiraSoftwareCloudApiRequest.call(
		this,
		'/api/2/serverInfo',
		'GET',
	) as Promise<JiraServerInfo>);
}

export async function getWebhookEndpoint(this: IHookFunctions) {
	const serverInfo = await getServerInfo.call(this).catch(() => null);

	if (!serverInfo || serverInfo.deploymentType === 'Cloud') return '/webhooks/1.0/webhook';

	// Assume old version when versionNumbers is not set
	const majorVersion = serverInfo.versionNumbers?.[0] ?? 1;

	return majorVersion >= 10 ? '/jira-webhook/1.0/webhooks' : '/webhooks/1.0/webhook';
}
