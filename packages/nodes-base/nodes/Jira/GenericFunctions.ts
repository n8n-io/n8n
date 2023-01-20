import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, INodeListSearchItems, NodeApiError } from 'n8n-workflow';

export async function jiraSoftwareCloudApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	endpoint: string,
	method: string,
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
	} else {
		domain = (await this.getCredentials('jiraSoftwareCloudApi')).domain as string;
		credentialType = 'jiraSoftwareCloudApi';
	}

	const options: OptionsWithUri = {
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

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (Object.keys(query || {}).length === 0) {
		delete options.qs;
	}
	try {
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		if (
			error.description?.includes &&
			error.description.includes("Field 'priority' cannot be set")
		) {
			throw new NodeApiError(this.getNode(), error, {
				message:
					"Field 'priority' cannot be set. You need to add the Priority field to your Jira Project's Issue Types.",
			});
		}
		throw error;
	}
}

export async function jiraSoftwareCloudApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	endpoint: string,
	method: string,
	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.startAt = 0;
	body.startAt = 0;
	query.maxResults = 100;
	body.maxResults = 100;

	do {
		responseData = await jiraSoftwareCloudApiRequest.call(this, endpoint, method, body, query);
		returnData.push.apply(returnData, responseData[propertyName]);
		query.startAt = (responseData.startAt as number) + (responseData.maxResults as number);
		body.startAt = (responseData.startAt as number) + (responseData.maxResults as number);
	} while (
		(responseData.startAt as number) + (responseData.maxResults as number) <
		responseData.total
	);

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

export function getId(url: string) {
	return url.split('/').pop();
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
