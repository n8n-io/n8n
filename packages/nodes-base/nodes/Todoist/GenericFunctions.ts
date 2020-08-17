import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions
} from 'n8n-core';

import * as _ from 'lodash';

export const filterAndExecuteForEachTask = async function(
	this: IExecuteSingleFunctions,
	taskCallback: (t: any) => any
) {
	const expression = this.getNodeParameter('expression') as string;
	const projectId = this.getNodeParameter('project') as number;
	// Enable regular expressions
	const reg = new RegExp(expression);
	const tasks = await todoistApiRequest.call(this, '/tasks', 'GET');
	const filteredTasks = tasks.filter(
		// Make sure that project will match no matter what the type is. If project was not selected match all projects
		(el: any) => (!projectId || el.project_id) && el.content.match(reg)
	);
	return {
		affectedTasks: (
			await Promise.all(filteredTasks.map((t: any) => taskCallback(t)))
		)
			// This makes it more clear and informative. We pass the ID as a convention and content to give the user confirmation that his/her expression works as expected
			.map(
				(el, i) =>
					el || { id: filteredTasks[i].id, content: filteredTasks[i].content }
			)
	};
};

export async function todoistApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions,
	resource: string,
	method: string,
	body: any = {},
	headers?: object
): Promise<any> {
	// tslint:disable-line:no-any
	const credentials = this.getCredentials('todoistApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const headerWithAuthentication = Object.assign({}, headers, { Authorization: `Bearer ${credentials.apiKey}` });

	const endpoint = 'api.todoist.com/rest/v1';

	const options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		uri: `https://${endpoint}${resource}`,
		json: true
	};

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	try {
		return this.helpers.request!(options);
	} catch (error) {
		const errorMessage = error.response.body.message || error.response.body.Message;

		if (errorMessage !== undefined) {
			throw errorMessage;
		}
		throw error.response.body;
	}
}
