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
import get = require('lodash.get');

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
		// {
		// 	name: 'Child Page',
		// 	value: 'child_page',
		// },
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

function getLink(text: { textLink: string, isLink: boolean }) {
	if (text.isLink === true) {
		return {
			link: {
				url: text.textLink,
			},
		};
	}
	return {};
}

function getTexts( texts : [{ textType: string, textContent: string, isLink: boolean, textLink: string, mentionType: string, annotationUi: IDataObject, expression: string }]) {
	const results = [];
	for (const text of texts) {
		if (text.textType === 'text') {
			results.push({
				type: 'text',
				text: {
					content: text.textContent,
					...getLink(text),
				},
				annotations: text.annotationUi,
			});
		} else if (text.textType === 'mention') {
			results.push({
				type: 'mention',
				mention: {
					type: text.mentionType,
					//@ts-ignore
					[text.mentionType]: text[mentionType] as string,
				},
				annotations: text.annotationUi,
			});
		} else if (text.textType === 'equation') {
			results.push({
				type: 'equation',
				equation: {
					expression: text.expression,
				},
				annotations: text.annotationUi,
			});
		}
	}
	return results;
}

export function formatBlocks(blocks: IDataObject[]) {
	const results = [];
	for (const block of blocks) {
		results.push({
			object: 'block',
			type: block.type,
			[block.type as string]: {
				...(block.type === 'to_do') ? { checked: block.checked } : { checked: false },
				//@ts-expect-error
				// tslint:disable-next-line: no-any
				text: getTexts(block.text.text as any || []),
			},
		});
	}
	return results;
}

export function mapProperties(properties: IDataObject[]) {
	return properties.reduce((obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }), {});
}

// tslint:disable-next-line: no-any
export function simplifyProperties(properties: any) {
	// tslint:disable-next-line: no-any
	const results: any = {};
	for (const key of Object.keys(properties)) {
		const type = (properties[key] as IDataObject).type as string;
		if (['text'].includes(properties[key].type)) {
			const texts = properties[key].text.map((e: IDataObject) => e.text || {});
			results[`${key}`] = texts;
		} else if (['url', 'created_time', 'checkbox', 'number', 'last_edited_time', 'email', 'phone_number', 'date'].includes(properties[key].type)) {
			// tslint:disable-next-line: no-any
			results[`${key}`] = properties[key][type] as any;
		} else if (['title'].includes(properties[key].type)) {
			results[`${key}`] = {};
			if (properties[key][type].length !== 0) {
				results[`${key}`] = properties[key][type][0].text || {};
			}
		} else if (['created_by', 'last_edited_by', 'select'].includes(properties[key].type)) {
			results[`${key}`] = properties[key][type].name;
		}  else if (['people'].includes(properties[key].type)) {
			// tslint:disable-next-line: no-any
			results[`${key}`] = properties[key][type].map((person: any) => person.person.email || {});
		} else if (['multi_select'].includes(properties[key].type)) {
			results[`${key}`] = properties[key][type].map((e: IDataObject) => e.name || {});
		} else if (['relation'].includes(properties[key].type)) {
			results[`${key}`] = properties[key][type].map((e: IDataObject) => e.id || {});
		} else if (['formula'].includes(properties[key].type)) {
			results[`${key}`] = properties[key][type][properties[key][type].type];
		}
		//figure how to resolve the rollup
		// else if (['rollup'].includes(properties[key].type)) {
		// 	results[`${key}`] = properties[key][type][properties[key][type].type];
		// }
	}
	return results;
}

// if (properties[key] !== undefined) {
// 	const type = (properties[key] as IDataObject).type as string;
// 	//@ts-expect-error
// 	if (properties[key][type].type !== undefined) {
// 		console.log(`condition-1 ${key}`);
// 		//@ts-ignore
// 		results[`${key}`] = simplifyProperties(properties[key][type])
// 		//@ts-ignore
// 	} else if (Array.isArray(properties[key][type])) {
// 		console.log(`condition-2 ${key}`);
// 		//@ts-expect-error
// 		results[`${key}`] = simplifyProperties(properties[key][type] as IDataObject)
// 	} else {
// 		//@ts-expect-error
// 		results[`${key}`] = properties[key][type] as any;
// 	}
// }

export function getFormattedChildren(children: IDataObject[]) {
	const results: IDataObject[] = [];
	for (const child of children) {
		const type = child.type;
		results.push({ [`${type}`]: child, object: 'block', type });
	}
	return results;
}