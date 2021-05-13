import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';
import { propertyEvents } from '../Hubspot/GenericFunctions';

export async function notionApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	try {
		const credentials = this.getCredentials('notionApi');
		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}
		let options: OptionsWithUri = {
			headers: {
				'Authorization': `Bearer ${credentials.apiKey}`,
			},
			method,
			qs,
			body,
			uri: uri || `https://api.notion.com/v1${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);

		console.log(options);

		return await this.helpers.request!(options);
	} catch (error) {

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			const errorBody = error.response.body;
			throw new Error(`Notion error response [${error.statusCode}]: ${errorBody.message}`);
		}

		throw error;
	}
}

export async function notionApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await notionApiRequest.call(this, method, endpoint, body, query);
		console.log(responseData);
		const { next_cursor } = responseData;
		query.start_cursor = next_cursor;
		returnData.push.apply(returnData, responseData[propertyName]);
		if (query.limit && query.limit <= returnData.length) {
			return returnData;
		}
	} while (
		responseData.has_more !== false
	);

	return returnData;
}

export function getBlockTypes() {
	return [
		{
			name: 'Paragraph',
			value: 'paragraph',
		},
		{
			name: 'Heading 1',
			value: 'heading_1',
		},
		{
			name: 'Heading 2',
			value: 'heading_2',
		},
		{
			name: 'Heading 3',
			value: 'heading_3',
		},
		{
			name: 'Toggle',
			value: 'toggle',
		},
		{
			name: 'To-Do',
			value: 'to_do',
		},
		{
			name: 'Child Page',
			value: 'child_page',
		},
		{
			name: 'Bulleted List Item',
			value: 'bulleted_list_item',
		},
		{
			name: 'Numbered List Item',
			value: 'numbered_list_item',
		},
	];
}

export function formatTitle(title: string) {
	return {
		title: [
			{
				text: {
					content: title,
				},
			},
		],
	};
}

export function mapProperties(properties: IDataObject[]) {
	return properties.reduce((obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }), {});
}

// export function simplifyProperties(properties: IDataObject) {
// 	const results: any = {};
// 	for (const key of Object.keys(properties)) {
// 		if (properties[key] !== undefined) {
// 			const type = (properties[key] as IDataObject).type as string;
// 			//@ts-expect-error
// 			if (properties[key][type].type !== undefined) {
// 				console.log(`condition-1 ${key}`);
// 				//@ts-ignore
// 				results[`${key}`] = simplifyProperties(properties[key][type])
// 				//@ts-ignore
// 			} else if (Array.isArray(properties[key][type])) {
// 				console.log(`condition-2 ${key}`);
// 				//@ts-expect-error
// 				results[`${key}`] = simplifyProperties(properties[key][type] as IDataObject)
// 			} else {
// 				//@ts-expect-error
// 				results[`${key}`] = properties[key][type] as any;
// 			}
// 		}
// 	}
// 	return results;
// }

export function getFormattedChildren(children: IDataObject[]) {
	const results: IDataObject[] = [];
	for (const child of children) {
		const type = child.type;
		results.push({ [`${type}`]: child, object: 'block', type });
	}
	return results;
}