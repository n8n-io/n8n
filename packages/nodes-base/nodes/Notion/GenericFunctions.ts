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
	IDataObject, IDisplayOptions, INodeProperties, INodePropertyOptions,
} from 'n8n-workflow';

import {
	capitalCase,
} from 'change-case';

import * as moment from 'moment-timezone';

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

function getTexts(texts: [{ textType: string, textContent: string, isLink: boolean, textLink: string, mentionType: string, annotationUi: IDataObject, expression: string }]) {
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

// tslint:disable-next-line: no-any
function getPropertyKeyValue(value: any, type: string, timezone: string) {
	console.log(value);
	console.log(type);
	let result = {};
	switch (type) {
		case 'rich_text':
			if (value.onlyContent) {
				result = [{ type: 'text', text: { content: value.content } }];
			} else {
				result = getTexts(value);
			}
			break;
		case 'title':
			result = [{ type: 'text', text: { content: value.content } }];
			break;
		case 'number':
			result = { type: 'number', number: value.numberValue };
			break;
		case 'url':
			result = { type: 'url', url: value.urlValue };
			break;
		case 'checkbox':
			result = { type: 'checkbox', checkbox: value.checkboxValue };
			break;
		case 'relation':
			result = {
				// tslint:disable-next-line: no-any
				type: 'relation', relation: (value.relationValue).reduce((acc: [], cur: any) => {
					return acc.concat(cur.split(',').map((relation: string) => ({ id: relation })));
				}, []),
			};
			break;
		case 'multi_select':
			result = {
				// tslint:disable-next-line: no-any
				type: 'multi_select', multi_select: value.multiSelectValue.filter((id: any) => id !== null).map((option: string) => ({ id: option })),
			};
			break;
		case 'email':
			result = {
				type: 'email', email: value.emailValue,
			};
			break;
		case 'people':
			result = {
				// tslint:disable-next-line: no-any
				type: 'people', people: (value.peopleValue).reduce((acc: [], cur: any) => {
					return acc.concat(cur.split(',').map((user: string) => ({ id: user })));
				}, []),
			};
			break;
		case 'phone_number':
			result = {
				type: 'phone_number', phone_number: value.phoneValue,
			};
			break;
		case 'select':
			result = {
				type: 'select', select: { id: value.selectValue },
			};
			break;
		case 'date':
			if (value.range === true) {
				result = {
					type: 'date', date: { start: moment.tz(value.dateStart, timezone).utc().format(), end: moment.tz(value.dateEnd, timezone).utc().format() },
				};
			} else {
				result = {
					type: 'date', date: { start: moment.tz(value.date, timezone).utc().format(), end: null },
				};
			}
			break;
		default:
	}
	return result;
}


export function mapProperties(properties: IDataObject[], timezone: string) {
	return properties.reduce((obj, value) => Object.assign(obj, {
		[`${(value.key as string).split('|')[0]}`]: getPropertyKeyValue(value, (value.key as string).split('|')[1], timezone),
	}), {});
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
		} else if (['people'].includes(properties[key].type)) {
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

export function getFilters() {

	const elements: INodeProperties[] = [];

	const types: { [key: string]: string } = {
		title: 'text',
		text: 'text',
	};

	const typeConditions: { [key: string]: string[] } = {
		text: [
			'equals',
			'does_not_equal',
			'contains',
			'does_not_contain',
			'starts_with',
			'ends_with',
			'is_empty',
			'is_not_empty',
		],
		number: [
			'equals',
			'does_not_equal',
			'grater_than',
			'less_than',
			'greater_than_or_equal_to',
			'less_than_or_equal_to',
			'is_empty',
			'is_not_empty',
		],
		checkbox: [
			'equals',
			'does_not_equal',
		],
		select: [
			'equals',
			'does_not_equal',
			'is_empty',
			'is_not_empty',
		],
		multi_select: [
			'contains',
			'does_not_equal',
			'is_empty',
			'is_not_empty',
		],
		date: [
			'equals',
			'before',
			'after',
			'on_or_before',
			'is_empty',
			'is_not_empty',
			'on_or_after',
			'past_week',
			'past_month',
			'past_year',
			'next_week',
			'next_month',
			'next_year',
		],
		people: [
			'equals',
			'does_not_equal',
			'is_empty',
			'is_not_empty',
		],
		files: [
			'is_empty',
			'is_not_empty',
		],
		relation: [
			'contains',
			'does_not_contain',
			'is_empty',
			'is_not_empty',
		],
	};

	for (const [index, type] of Object.keys(types).entries()) {
		elements.push(
			{
				displayName: 'Condition',
				name: `condition${index}`,
				type: 'options',
				displayOptions: {
					show: {
						type: [
							type,
						],
					},
				} as IDisplayOptions,
				options: (typeConditions[types[type]] as string[]).map((type: string) => ({ name: capitalCase(type), value: type })),
				default: '',
				description: 'The value of the property to filter by.',
			} as INodeProperties,
		);
	}
	console.log(JSON.stringify(elements[0]));
	return elements;
}