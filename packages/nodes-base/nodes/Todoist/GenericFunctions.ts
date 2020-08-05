import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

// import * as _ from 'lodash';

// export const filterAndExecuteForEachTask = async function(
// 	this: IExecuteSingleFunctions,
// 	taskCallback: (t: any) => any
// ) {
// 	const expression = this.getNodeParameter('expression') as string;
// 	const projectId = this.getNodeParameter('project') as number;
// 	// Enable regular expressions
// 	const reg = new RegExp(expression);
// 	const tasks = await todoistApiRequest.call(this, '/tasks', 'GET');
// 	const filteredTasks = tasks.filter(
// 		// Make sure that project will match no matter what the type is. If project was not selected match all projects
// 		(el: any) => (!projectId || el.project_id) && el.content.match(reg)
// 	);
// 	return {
// 		affectedTasks: (
// 			await Promise.all(filteredTasks.map((t: any) => taskCallback(t)))
// 		)
// 			// This makes it more clear and informative. We pass the ID as a convention and content to give the user confirmation that his/her expression works as expected
// 			.map(
// 				(el, i) =>
// 					el || { id: filteredTasks[i].id, content: filteredTasks[i].content }
// 			)
// 	};
// };

export async function todoistApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	headers?: object
): Promise<any> { // tslint:disable-line:no-any
	const authentication = this.getNodeParameter('authentication', 0, 'apiKey');

	const endpoint = 'api.todoist.com/rest/v1';

	const options: OptionsWithUri = {
		headers: {},
		method,
		qs,
		uri: `https://${endpoint}${resource}`,
		json: true,
	};

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	try {
		if (authentication === 'apiKey') {
			const credentials = this.getCredentials('todoistApi') as IDataObject;

			//@ts-ignore
			options.headers['Authorization'] = `Bearer ${credentials.apiKey}`;

			return this.helpers.request!(options);
		} else {
			//@ts-ignore
			return await this.helpers.requestOAuth2.call(this, 'todoistOAuth2Api', options);
		}

	} catch (error) {
		const errorMessage = error.response.body;

		if (errorMessage !== undefined) {
			throw new Error(errorMessage);
		}

		throw errorMessage;
	}
}
